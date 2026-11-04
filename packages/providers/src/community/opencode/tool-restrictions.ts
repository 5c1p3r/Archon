import type { NodeConfig } from '../../types';

/**
 * Translates a node's `allowed_tools` / `denied_tools` into OpenCode's prompt-body
 * `tools` map.
 *
 * What OpenCode does with that map (server source, `session/prompt.ts` and
 * `session/llm/request.ts`): each entry becomes a session permission rule
 * `{ permission: <key>, pattern: '*', action: allow | deny }`, appended after the
 * agent's (user-configured) rules; keys are case-sensitive wildcards and the LAST
 * matching rule wins. A tool is withheld from the model when its last matching rule
 * is `deny` on `*`.
 *
 * So a `false` entry only narrows. A `true` entry is an `allow` on every pattern,
 * which overrides the user's own OpenCode policy for that permission — e.g. the
 * default `*.env` read deny, or a `bash` `ask`/`deny` rule — and would broaden
 * permissions. That is why a non-empty `allowed_tools` is refused rather than
 * translated: OpenCode has no rule that re-enables a tool without also overriding
 * the user's policy for it. `denied_tools` and `allowed_tools: []` are exact.
 */

/** OpenCode's tool for `format: json_schema`; it passes the same permission filter as every other tool. */
const STRUCTURED_OUTPUT_TOOL = 'StructuredOutput';

export function nodeToolsMap(
  nodeConfig: NodeConfig | undefined,
  structuredOutput: boolean
): Record<string, boolean> | undefined {
  const allowed = nodeConfig?.allowed_tools;
  const denied = nodeConfig?.denied_tools;
  if (allowed !== undefined && allowed.length > 0) {
    throw new Error(
      `OpenCode cannot enforce a non-empty allowed_tools (${allowed.join(', ')}): re-enabling a ` +
        "tool in OpenCode also overrides the user's OpenCode permission policy for it. " +
        'Use denied_tools to remove tools, or allowed_tools: [] to disable every tool.'
    );
  }
  if (allowed === undefined && (denied === undefined || denied.length === 0)) return undefined;

  const tools: Record<string, boolean> = {};
  if (allowed !== undefined) {
    tools['*'] = false;
    // The node's own output_format still needs its tool; allowing it overrides no user policy.
    if (structuredOutput) tools[STRUCTURED_OUTPUT_TOOL] = true;
  }
  for (const tool of denied ?? []) tools[tool] = false;
  return tools;
}

/**
 * Merges the node's rules over an inline agent's map. Node keys are re-inserted so
 * they come last: OpenCode's last-match-wins evaluation follows insertion order, and
 * the node's restriction must narrow the agent's, never the reverse.
 */
export function mergeToolsMaps(
  agentTools: Record<string, boolean> | undefined,
  nodeTools: Record<string, boolean> | undefined
): Record<string, boolean> | undefined {
  if (!nodeTools) return agentTools;
  const merged: Record<string, boolean> = { ...agentTools };
  for (const [tool, enabled] of Object.entries(nodeTools)) {
    delete merged[tool];
    merged[tool] = enabled;
  }
  return merged;
}

/**
 * `denied_tools` names that match none of the server's registered tool ids. OpenCode
 * matches names case-sensitively, so a Claude-style `Bash` denies nothing. Wildcard
 * names are not checked; MCP tools are not in the registry, so a denied MCP tool is
 * reported too (the warning says so).
 */
export function unregisteredDeniedTools(
  nodeConfig: NodeConfig | undefined,
  registeredIds: readonly string[]
): string[] {
  const known = new Set(registeredIds);
  return (nodeConfig?.denied_tools ?? []).filter(
    tool => !tool.includes('*') && !tool.includes('?') && !known.has(tool)
  );
}
