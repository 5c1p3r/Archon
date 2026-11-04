import { diagnoseOpencode } from './diagnostics';
import { probeOpencodeRuntime } from './runtime';
import type { CredentialStatus } from '@archon/provider-contract';
import { join } from 'node:path';

import { createLogger } from '@archon/paths';

import type {
  IAgentProvider,
  MessageChunk,
  ProviderCapabilities,
  SendQueryOptions,
} from '../../types';

import { getOrderedAgents } from './agent-config';
import { OPENCODE_CAPABILITIES } from './capabilities';
import { parseModelRef, parseOpencodeConfig } from './config';
import { opencodeFailureClass } from './errors';
import { materializeAgents } from './agent-fs';
import { failureResult } from '../../shared/failure';
import { streamMultiAgentOpencodeSession } from './multi-agent';
import {
  acquireEmbeddedRuntime,
  disposeInstanceForDirectory,
  releaseEmbeddedRuntime,
  type OpencodeClientLike,
} from './runtime';
import { resolveSessionId, streamOpencodeSession } from './session';
import { unregisteredDeniedTools } from './tool-restrictions';
import { withResumedOutcome, resumedOutcome } from '../../shared/resumed';
import { closeOpenToolCalls } from '../../shared/tool-calls';

export { parseModelRef } from './config';
export { resetEmbeddedRuntime } from './runtime';

let cachedLog: ReturnType<typeof createLogger> | undefined;

function getLog(): ReturnType<typeof createLogger> {
  if (!cachedLog) cachedLog = createLogger('provider.opencode');
  return cachedLog;
}

/**
 * Warns when a `denied_tools` name matches no tool the server registered, so a
 * misspelled or Claude-cased name (`Bash`) is reported instead of denying nothing.
 * The lookup only enriches the report: if it fails, the restriction is still sent
 * and the failure is logged.
 */
async function* unregisteredDeniedToolsWarning(
  client: OpencodeClientLike,
  cwd: string,
  requestOptions: SendQueryOptions | undefined
): AsyncGenerator<MessageChunk> {
  if (!requestOptions?.nodeConfig?.denied_tools?.length || !client.tool) return;
  let ids: unknown;
  try {
    ids = (await client.tool.ids({ query: { directory: cwd } })).data;
  } catch (error) {
    getLog().warn({ err: error }, 'opencode.tool_ids_lookup_failed');
    return;
  }
  if (!Array.isArray(ids)) {
    getLog().warn('opencode.tool_ids_lookup_failed');
    return;
  }
  const unregistered = unregisteredDeniedTools(
    requestOptions.nodeConfig,
    ids.filter((id): id is string => typeof id === 'string')
  );
  if (unregistered.length === 0) return;
  yield {
    type: 'warning',
    code: 'opencode.unknown_tools',
    message:
      `denied_tools names no registered OpenCode tool: ${unregistered.join(', ')}. ` +
      'OpenCode tool names are case-sensitive (bash, not Bash). MCP tools are not in the ' +
      'registry, so a denied MCP tool is listed here too.',
  };
}

export class OpencodeProvider implements IAgentProvider {
  constructor(private readonly diagnosticProbe = probeOpencodeRuntime) {}
  diagnose(
    request: Parameters<NonNullable<IAgentProvider['diagnose']>>[0]
  ): ReturnType<typeof diagnoseOpencode> {
    request.signal.throwIfAborted();
    return diagnoseOpencode(request.signal, this.diagnosticProbe);
  }

  async checkCredential(): Promise<CredentialStatus> {
    return { state: 'not_checked', source: 'native' };
  }

  /**
   * One call is one attempt; the engine owns retry. A failure, including one thrown
   * while setting the turn up, ends in a `result` carrying a typed `failure`, then
   * `settled`. The class is `auth` or `rate_limited` only when the SDK's auth
   * discriminator or HTTP status says so; every other failure is `unknown` with its
   * text as evidence. Only cancellation throws.
   */
  async *sendQuery(
    prompt: string,
    cwd: string,
    resumeSessionId?: string,
    requestOptions?: SendQueryOptions
  ): AsyncGenerator<MessageChunk> {
    let resultReported = false;
    try {
      for await (const chunk of closeOpenToolCalls(
        this.streamTurn(prompt, cwd, resumeSessionId, requestOptions),
        { resultEndsTurn: true }
      )) {
        if (chunk.type === 'result') resultReported = true;
        yield chunk;
      }
    } catch (error) {
      if (requestOptions?.abortSignal?.aborted === true) throw error;
      const err = error as Error;
      // The turn already reported its one result; a later error does not change it.
      if (resultReported) getLog().error({ err }, 'opencode.error_after_result');
      else yield failureResult(opencodeFailureClass(error), 'opencode_query_failed', err.message);
    }
    // Nothing more runs for this turn once its stream has ended.
    yield { type: 'settled' };
  }

  private async *streamTurn(
    prompt: string,
    cwd: string,
    resumeSessionId?: string,
    requestOptions?: SendQueryOptions
  ): AsyncGenerator<MessageChunk> {
    const assistantConfig = parseOpencodeConfig(requestOptions?.assistantConfig ?? {});
    const modelRef = requestOptions?.model ?? assistantConfig.model;
    const parsedModelOrNull = modelRef ? parseModelRef(modelRef) : undefined;

    if (modelRef && !parsedModelOrNull) {
      throw new Error(
        `Invalid OpenCode model ref: '${modelRef}'. Expected format '<provider>/<model>' (for example 'anthropic/claude-3-5-sonnet').`
      );
    }

    if (!parsedModelOrNull) {
      throw new Error(
        'OpenCode requires a model to be specified. ' +
          'Set model in assistants config (e.g., model: anthropic/claude-3-5-sonnet).'
      );
    }

    const parsedModel = parsedModelOrNull;

    const nodeAgents = requestOptions?.nodeConfig?.agents;
    const nodeId = requestOptions?.nodeConfig?.nodeId;
    const orderedAgents = getOrderedAgents(requestOptions?.nodeConfig);
    const hasAgentConfig = orderedAgents.length > 0;
    const isMultiAgent = orderedAgents.length > 1;
    const sessionCwd = hasAgentConfig && nodeId ? join(cwd, '.archon-opencode', nodeId) : cwd;

    if (requestOptions?.abortSignal?.aborted) {
      throw new Error('OpenCode query aborted');
    }

    const embedded = await acquireEmbeddedRuntime(requestOptions?.abortSignal);
    const client = embedded.client;

    try {
      yield* unregisteredDeniedToolsWarning(client, sessionCwd, requestOptions);

      // When agents are defined, use a per-node session directory so each node
      // gets its own OpenCode InstanceState — preventing stale agent cache from
      // previous nodes in the same workflow run.
      if (hasAgentConfig && nodeAgents) {
        await materializeAgents(sessionCwd, nodeAgents);
        await disposeInstanceForDirectory(client, sessionCwd);
      }

      if (isMultiAgent) {
        if (!nodeId) {
          throw new Error(
            'OpenCode multi-agent execution requires a nodeId in nodeConfig. ' +
              'Ensure the workflow node sets nodeConfig.nodeId.'
          );
        }
        // Multi-agent always starts fresh — it resolves its own per-node
        // sessions internally and cannot resume a single prior session. If a
        // resume was requested, report it as cold (false) so the executor
        // surfaces the lost continuity instead of silently starting fresh.
        yield* withResumedOutcome(
          streamMultiAgentOpencodeSession(
            client,
            sessionCwd,
            nodeId,
            prompt,
            parsedModel,
            requestOptions
          ),
          resumedOutcome(resumeSessionId, false)
        );
        return;
      }

      const { sessionId, resumed } = await resolveSessionId(client, sessionCwd, resumeSessionId);
      if (resumeSessionId && !resumed) {
        yield {
          type: 'warning',
          code: 'opencode.resume_failed',
          message: 'Could not resume OpenCode session. Starting fresh conversation.',
        };
      }

      yield* withResumedOutcome(
        streamOpencodeSession(client, sessionCwd, sessionId, prompt, parsedModel, requestOptions),
        resumedOutcome(resumeSessionId, resumed)
      );
    } finally {
      releaseEmbeddedRuntime(embedded);
    }
  }

  getType(): string {
    return 'opencode';
  }

  getCapabilities(): ProviderCapabilities {
    return OPENCODE_CAPABILITIES;
  }
}
