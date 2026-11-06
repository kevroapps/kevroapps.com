import Anthropic from '@anthropic-ai/sdk';
import knowledge from './knowledge.js';
import { buildSystemPrompt, HANDOFF_MARKER } from './prompt.js';

export const MAX_TOKENS = 500;

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
  const reply = text.split(HANDOFF_MARKER).join('').trim();
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
