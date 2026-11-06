import { parseChat, parseHandoff } from './validate.js';
import { allow } from './ratelimit.js';
import { answer } from './chat.js';
import { sendHandoff } from './email.js';

// Every response is JSON. Failures never carry text for visitors: the website shows its own
// (reviewed) wording when it sees `fallback: true`, which points people to the support email.
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const ok = origin && allowedOrigins(env).includes(origin);
  return ok
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }
    : { Vary: 'Origin' };
}

const enabled = (env) => String(env.CHAT_ENABLED ?? 'true').toLowerCase() !== 'false';
const chatReady = (env) => Boolean(env.ANTHROPIC_API_KEY);
const mailReady = (env) => Boolean(env.RESEND_API_KEY && env.SUPPORT_EMAIL && env.FROM_EMAIL);

async function readJson(request) {
  try {
    const text = await request.text();
    if (text.length > 20_000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function handle(request, env, deps = {}) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  const originOk = Boolean(cors['Access-Control-Allow-Origin']);

  if (request.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });

  if (url.pathname === '/health' && request.method === 'GET') {
    // No secrets, no counts: only whether each part is switched on and configured.
    return json({ ok: true, enabled: enabled(env), chat: chatReady(env), email: mailReady(env) }, 200, cors);
  }

  if (request.method !== 'POST' || !['/chat', '/handoff'].includes(url.pathname)) return json({ error: 'not_found' }, 404, cors);
  if (!originOk) return json({ error: 'forbidden' }, 403, cors);

  if (!enabled(env)) return json({ fallback: true, code: 'disabled' }, 503, cors);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const body = await readJson(request);
  if (!body) return json({ error: 'bad_json' }, 400, cors);

  if (url.pathname === '/chat') {
    if (!chatReady(env)) return json({ fallback: true, code: 'not_configured' }, 503, cors);
    const parsed = parseChat(body);
    if (parsed.error) return json({ error: parsed.error }, 400, cors);
    if (!(await allow(env, 'chat', ip))) return json({ fallback: true, code: 'rate_limited' }, 429, cors);
    try {
      const out = await answer(env, parsed.messages, deps);
      return json({ reply: out.reply, handoff: out.handoff }, 200, cors);
    } catch {
      return json({ fallback: true, code: 'upstream_error' }, 502, cors);
    }
  }

  // /handoff
  if (!mailReady(env)) return json({ fallback: true, code: 'not_configured' }, 503, cors);
  const data = parseHandoff(body);
  if (data.spam) return json({ ok: true }, 200, cors); // pretend success so bots learn nothing
  if (data.error) return json({ error: data.error }, 400, cors);
  if (!(await allow(env, 'handoff', ip))) return json({ fallback: true, code: 'rate_limited' }, 429, cors);
  try {
    await sendHandoff(env, data, deps.fetch);
    return json({ ok: true }, 200, cors);
  } catch {
    return json({ fallback: true, code: 'email_failed' }, 502, cors);
  }
}

export default { fetch: (request, env) => handle(request, env) };
