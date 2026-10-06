import type { ContentBlock } from '@animalabs/membrane';
import { toolNameMatches } from './tool-prose-hoist.js';

/**
 * Provider-facing omission of explicitly private tool arguments.
 *
 * Raw Chronicle messages are never changed. The transformed request preserves
 * the tool call, its id, every unlisted field, and message order; only configured
 * top-level string arguments are replaced with the empty string. This is an
 * opt-in privacy policy for fields whose host contract says their prose must not
 * be replayed to a summarizer (for example `skip_reply.reason`).
 */
export interface ToolArgRedactionOptions {
  /** Tools to rewrite (exact name or final `--`-separated segment). */
  fromTools: readonly string[];
  /** Top-level string argument names to empty. */
  fields: readonly string[];
}

export interface ToolArgRedactionResult<T> {
  messages: T[];
  redacted: number;
  characters: number;
}

type WireMessage = { participant: string; content: ContentBlock[] };
type ToolUse = ContentBlock & { type: 'tool_use'; name: string; input: unknown };

export function redactToolArguments<T extends WireMessage>(
  messages: readonly T[],
  options: ToolArgRedactionOptions,
): ToolArgRedactionResult<WireMessage> {
  const fields = new Set(options.fields);
  let redacted = 0;
  let characters = 0;
  const out = messages.map((message) => {
    let messageChanged = false;
    const content = message.content.map((block) => {
      if (block.type !== 'tool_use') return block;
      const use = block as ToolUse;
      if (!toolNameMatches(use.name, options.fromTools)) return block;
      if (!use.input || typeof use.input !== 'object' || Array.isArray(use.input)) return block;
      let inputChanged = false;
      const input: Record<string, unknown> = { ...(use.input as Record<string, unknown>) };
      for (const field of fields) {
        const value = input[field];
        if (typeof value !== 'string' || value.length === 0) continue;
        redacted++;
        characters += value.length;
        input[field] = '';
        inputChanged = true;
      }
      if (!inputChanged) return block;
      messageChanged = true;
      return { ...use, input } as ContentBlock;
    });
    return messageChanged ? { ...message, content } : message;
  });
  return { messages: out, redacted, characters };
}
