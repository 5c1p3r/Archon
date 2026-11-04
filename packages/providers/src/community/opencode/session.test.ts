import { describe, expect, test } from 'bun:test';

import { createSessionPromptBody } from './session';

const model = { providerID: 'anthropic', modelID: 'claude-sonnet' };

describe('createSessionPromptBody', () => {
  test('sends appended chat instructions as the system prompt', () => {
    const body = createSessionPromptBody('hi', model, { appendSystemPrompt: 'append' });
    expect(body.system).toBe('append');
  });

  test('prefers an explicit system prompt over appended instructions', () => {
    const body = createSessionPromptBody('hi', model, {
      systemPrompt: 'system',
      nodeConfig: { systemPrompt: 'node' },
      appendSystemPrompt: 'append',
    });
    expect(body.system).toBe('system');
  });
  test('prefers a node system prompt over appended instructions', () => {
    expect(
      createSessionPromptBody('hi', model, {
        nodeConfig: { systemPrompt: 'node' },
        appendSystemPrompt: 'append',
      }).system
    ).toBe('node');
  });
});

// OpenCode turns each `tools` entry into a session permission rule
// `{ permission: key, pattern: '*', action: allow|deny }`, last match wins. A
// `true` entry would override the user's own OpenCode policy, so node fields may
// only ever produce `false` entries (plus the node's own StructuredOutput tool).
describe('createSessionPromptBody node tool restrictions', () => {
  test('a node without tool fields sends no tools map, leaving the user policy alone', () => {
    expect(createSessionPromptBody('hi', model, { nodeConfig: {} })).not.toHaveProperty('tools');
  });

  test('allowed_tools: [] disables every tool', () => {
    const body = createSessionPromptBody('hi', model, { nodeConfig: { allowed_tools: [] } });
    expect(body.tools).toEqual({ '*': false });
  });

  test('allowed_tools: [] keeps the tool the node needs for output_format', () => {
    const body = createSessionPromptBody('hi', model, {
      nodeConfig: { allowed_tools: [] },
      outputFormat: { type: 'json_schema', schema: { type: 'object' } },
    });
    expect(Object.entries(body.tools ?? {})).toEqual([
      ['*', false],
      ['StructuredOutput', true],
    ]);
  });

  test('denied_tools only ever denies', () => {
    const body = createSessionPromptBody('hi', model, {
      nodeConfig: { denied_tools: ['bash', 'edit', 'github_*'] },
    });
    expect(body.tools).toEqual({ bash: false, edit: false, 'github_*': false });
  });

  test('a non-empty allowed_tools is refused instead of overriding the user policy', () => {
    expect(() =>
      createSessionPromptBody('hi', model, { nodeConfig: { allowed_tools: ['read'] } })
    ).toThrow(/cannot enforce a non-empty allowed_tools \(read\)/);
  });

  test('node rules come after an inline agent map so they narrow it', () => {
    const agents = {
      reviewer: {
        description: 'Reviewer',
        prompt: 'Review',
        tools: ['bash', 'read'],
      },
    };
    const denied = createSessionPromptBody('hi', model, {
      nodeConfig: { agents, denied_tools: ['bash'] },
    });
    expect(Object.entries(denied.tools ?? {})).toEqual([
      ['read', true],
      ['bash', false],
    ]);

    const none = createSessionPromptBody('hi', model, {
      nodeConfig: { agents, allowed_tools: [] },
    });
    expect(Object.entries(none.tools ?? {}).at(-1)).toEqual(['*', false]);
  });
});
