import Anthropic from '@anthropic-ai/sdk';
import knowledge from './knowledge.js';
import { buildSystemPrompt, HANDOFF_MARKER } from './prompt.js';

// Thinking is always on and counts toward this limit, and Arabic takes more tokens than English,
// so 500 cut Arabic replies off mid sentence. The prompt keeps replies to a few sentences anyway.
export const MAX_TOKENS = 1500;

export function createAnthropic(apiKey) {
  return new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });
}

// Turns the model's reply into { reply, handoff }. The marker asks the website to offer the
// email form; it is never shown to the visitor.
export function readReply(message) {
  if (!message || message.stop_reason === 'refusal') return { reply: '', handoff: true, refused: true };
  const text = (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  const handoff = text.includes(HANDOFF_MARKER);
  let reply = text.split(HANDOFF_MARKER).join('').trim();
  // If the limit still cut the reply short, drop the unfinished last sentence so no half link or half word reaches a visitor.
  if (message.stop_reason === 'max_tokens') {
    const cut = Math.max(reply.lastIndexOf('. '), reply.lastIndexOf('.\n'), reply.lastIndexOf('؟'), reply.lastIndexOf('? '), reply.lastIndexOf('! '));
    if (cut > 40) reply = reply.slice(0, cut + 1).trim();
  }
  if (!reply) return { reply: '', handoff: true, refused: false };
  return { reply, handoff };
}

export async function answer(env, messages, deps = {}) {
  const client = (deps.createClient || createAnthropic)(env.ANTHROPIC_API_KEY);
  const message = await client.beta.messages.create({
    model: env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: MAX_TOKENS,
    // Stable block first and cached; per-visitor text only in `messages`.
    system: [{ type: 'text', text: buildSystemPrompt(knowledge), cache_control: { type: 'ephemeral' } }],
    messages,
    // Opus 5.5: thinking is always on, so depth is set with effort alone. Low keeps replies fast and cheap.
    output_config: { effort: 'low' },
    // If a safety check declines a harmless question, rerun it on the fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  return readReply(message);
}
