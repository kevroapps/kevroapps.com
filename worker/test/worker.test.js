import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/index.js';
import { parseChat, parseHandoff, LIMITS } from '../src/validate.js';
import { readReply, MAX_TOKENS } from '../src/chat.js';
import { buildEmail } from '../src/email.js';
import { RULES, buildSystemPrompt, HANDOFF_MARKER } from '../src/prompt.js';
import { resetLimits } from '../src/ratelimit.js';
import knowledge from '../src/knowledge.js';
import { buildKnowledge } from '../scripts/build-knowledge.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ORIGIN = 'https://kevroapps.com';
const baseEnv = {
  ALLOWED_ORIGINS: 'https://kevroapps.com,https://www.kevroapps.com',
  CHAT_ENABLED: 'true',
  CLAUDE_MODEL: 'claude-opus-5-5',
  SUPPORT_EMAIL: 'support@kevroapps.com',
  FROM_EMAIL: 'Kevro Apps website <chat@send.kevroapps.com>',
  ANTHROPIC_API_KEY: 'test-key',
  RESEND_API_KEY: 'test-resend',
};

const post = (path, body, { origin = ORIGIN, ip = '1.1.1.1' } = {}) =>
  new Request('https://chat.example.workers.dev' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const fakeClient = (reply, calls = []) => ({
  beta: { messages: { create: async (params) => { calls.push(params); return reply; } } },
});
const okReply = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });
const deps = (reply, calls) => ({ createClient: () => fakeClient(reply, calls) });

test.beforeEach(() => resetLimits());

// ---------- knowledge and prompt ----------

test('knowledge.js is in step with docs/chat_knowledge', () => {
  const onDisk = readFileSync(new URL('../src/knowledge.js', import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
  assert.equal(onDisk, buildKnowledge());
});

test('knowledge covers every app and the studio, with a Source line each', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'chat_knowledge');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  assert.deepEqual(files.sort(), ['ayah-play.md', 'islamic-coloring.md', 'kevro-apps.md', 'quraan-class.md']);
  for (const f of files) assert.match(readFileSync(join(dir, f), 'utf8'), /\nSource:/, f);
  for (const name of ['Islamic Coloring for Kids', "Qur'aan Class", 'Ayah Play']) assert.ok(knowledge.includes(name), name);
});

test('knowledge states no prices, release dates or version numbers', () => {
  assert.doesNotMatch(knowledge, /\$\s?\d|USD|QAR\s?\d|\bv?\d+\.\d+\.\d+\b/);
  assert.doesNotMatch(knowledge, /\bwas\s+\$|\bwas\s+\d/i);
});

test('knowledge follows the copy rules: no dash punctuation, no crescent, no hifz words', () => {
  assert.doesNotMatch(knowledge, /[–—]/);
  assert.doesNotMatch(knowledge, /hifz|sabaq|musabaqah|crescent symbol/i);
});

test('knowledge holds back what is not public: no iPhone plan, no offer amount or end date, no age range', () => {
  assert.doesNotMatch(knowledge, /iphone is being|30 percent|until the end of ramadan|ages? 3|3 to 12/i);
  assert.match(knowledge, /offers the support email/);
});

test('knowledge says Islamic Coloring is for kids, not for Muslim kids', () => {
  assert.doesNotMatch(knowledge, /muslim (kids|children|child)/i);
  assert.match(knowledge, /learning app for kids/);
});

test('the rules carry the Arabic and naming guidance from the Arabic review', () => {
  for (const needle of [
    'Modern Standard Arabic suited to Gulf parents and teachers',
    'Respond naturally to greetings in the visitor\'s language',
    'Never start an Islamic greeting yourself and never open a reply with one',
    'Only when the visitor opens with an Islamic greeting, return it once and carry on',
    'وعليكم السلام، أهلًا بكم. كيف يمكنني مساعدتكم؟',
    'Wa alaikum assalam, welcome. How can I help?',
    'If the visitor gives the full greeting',
    'وعليكم السلام ورحمة الله وبركاته، أهلًا بكم. كيف يمكنني مساعدتكم؟',
    'Wa alaikum assalam wa rahmatullahi wa barakatuh, welcome. How can I help?',
    'In English replies only',
    'Use official app names exactly as given in KNOWLEDGE',
    'Do not invent Arabic names for Islamic Coloring or Ayah Play',
    'do not assume the gender of the visitor or of any parent, child, teacher or student mentioned',
    'include the exact English feature label in parentheses',
    'الحروف العربية الثمانية والعشرين',
    'When replying only to a greeting',
    'Do not list all the apps unless asked',
    'summarize the most relevant points instead of listing every feature',
    'no markdown symbols',
    'Repeat privacy and safety claims only exactly as stated in confirmed KNOWLEDGE',
    'never say that a form will appear',
    'If the visitor says yes to your offer to pass their question on, end that reply with the marker',
    'at most once in a conversation',
    'Your name is Kevro',
    'say you are Kevro, the Kevro Apps AI assistant, and always say plainly that you are an AI assistant',
    'write the studio name as كيفرو آبس, with Kevro Apps in Latin letters in parentheses at its first mention',
    "Write the assistant's own name as «كيفرو»",
    'Use guillemets only around the assistant\'s name, never around the studio or app names',
    'حلقة القرآن stays in Arabic',
    'Partnership, reseller, press and other business questions are for the studio',
    'do not bring up unrelated things such as the closed test',
  ]) assert.ok(RULES.includes(needle), needle);
});

test('the rules cover each of the required behaviours', () => {
  for (const needle of ['only', 'Never state a price', 'release date', "child's name", 'passwords', 'language the visitor writes', HANDOFF_MARKER, 'Never invent links', 'AI assistant']) {
    assert.ok(RULES.includes(needle), needle);
  }
  assert.ok(buildSystemPrompt('K').endsWith('K'));
});

// ---------- validation ----------

test('parseChat accepts a normal turn and defaults the language to English', () => {
  const r = parseChat({ messages: [{ role: 'user', content: ' Hello ' }] });
  assert.deepEqual(r, { messages: [{ role: 'user', content: 'Hello' }], lang: 'en' });
});

test('parseChat keeps the last turns, starts on a visitor turn and ends on one', () => {
  const messages = [];
  for (let i = 0; i < 20; i++) messages.push({ role: i % 2 ? 'assistant' : 'user', content: 'm' + i });
  messages.push({ role: 'assistant', content: 'tail' });
  assert.equal(parseChat({ messages }).error, 'last_must_be_user');
  messages.push({ role: 'user', content: 'last' });
  const r = parseChat({ messages });
  assert.equal(r.messages[0].role, 'user');
  assert.equal(r.messages.at(-1).content, 'last');
  assert.ok(r.messages.length <= LIMITS.maxTurns);
});

test('parseChat rejects bad input', () => {
  assert.equal(parseChat(null).error, 'messages_required');
  assert.equal(parseChat({ messages: [] }).error, 'messages_required');
  assert.equal(parseChat({ messages: [{ role: 'system', content: 'x' }] }).error, 'bad_message');
  assert.equal(parseChat({ messages: [{ role: 'user', content: 5 }] }).error, 'bad_message');
  assert.equal(parseChat({ messages: [{ role: 'user', content: '   ' }] }).error, 'empty_message');
  assert.equal(parseChat({ messages: [{ role: 'user', content: 'x'.repeat(LIMITS.maxMessageChars + 1) }] }).error, 'message_too_long');
});

test('parseChat: long earlier turns never refuse a short new message (the live "too long" defect)', () => {
  const longAnswer = 'The Qur’aan Class app helps teachers. '.repeat(40); // about 1,500 characters, like a real answer
  const messages = [
    { role: 'user', content: 'Assalamu alaikum' },
    { role: 'assistant', content: 'Wa alaikum assalam. How can I help?' },
    { role: 'user', content: 'Do you have a Quran app?' },
    { role: 'assistant', content: longAnswer },
    { role: 'user', content: 'Yes please' },
    { role: 'assistant', content: longAnswer },
    { role: 'user', content: 'Can I be a partner?' },
  ];
  const r = parseChat({ messages });
  assert.equal(r.error, undefined);
  assert.equal(r.messages.at(-1).content, 'Can I be a partner?');
  assert.equal(r.messages.at(-1).role, 'user');
  assert.equal(r.messages[0].role, 'user');
});

test('parseChat: the per-message limit applies to the new message only; earlier turns are clipped', () => {
  const huge = 'x'.repeat(LIMITS.maxHistoryMessageChars + 500);
  const r = parseChat({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: huge }, { role: 'user', content: 'ok' }] });
  assert.equal(r.messages[1].content.length, LIMITS.maxHistoryMessageChars);
  assert.equal(parseChat({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'a' }, { role: 'user', content: 'x'.repeat(LIMITS.maxMessageChars + 1) }] }).error, 'message_too_long');
});

test('parseChat: a long history is trimmed from the oldest turns, keeping the new message and a visitor first turn', () => {
  const messages = [];
  for (let i = 0; i < 12; i++) messages.push({ role: i % 2 ? 'assistant' : 'user', content: String(i).padStart(2, '0') + 'y'.repeat(3000) });
  messages.push({ role: 'user', content: 'Short new question' });
  const r = parseChat({ messages });
  const total = r.messages.reduce((n, m) => n + m.content.length, 0);
  assert.ok(total <= LIMITS.maxHistoryChars);
  assert.equal(r.messages.at(-1).content, 'Short new question');
  assert.equal(r.messages[0].role, 'user');
  assert.ok(r.messages.length < 12);
});

test('parseChat: an empty earlier turn is skipped, an empty new message is refused', () => {
  const r = parseChat({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: '  ' }, { role: 'user', content: 'ok' }] });
  assert.equal(r.error, undefined);
  assert.equal(parseChat({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'a' }, { role: 'user', content: '  ' }] }).error, 'empty_message');
});

test('chat over HTTP: a conversation with long assistant answers still gets a reply', async () => {
  const longAnswer = 'Qur’aan Class helps teachers and families. '.repeat(40);
  const body = { messages: [
    { role: 'user', content: 'Do you have a Quran app?' }, { role: 'assistant', content: longAnswer },
    { role: 'user', content: 'Yes please' }, { role: 'assistant', content: longAnswer },
    { role: 'user', content: 'Can I be a partner?' },
  ] };
  const res = await handle(post('/chat', body), baseEnv, deps(okReply('Please write to the studio.\n' + HANDOFF_MARKER)));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'Please write to the studio.', handoff: true });
});

test('parseHandoff cleans fields, rejects bad email, and flags the honeypot', () => {
  const ok = parseHandoff({ name: 'Aisha\r\nBcc: x@y.com', email: 'a@b.co', question: 'Is it on iPhone?', lang: 'ar', page: '/apps/' });
  assert.equal(ok.name, 'Aisha Bcc: x@y.com');
  assert.equal(ok.lang, 'ar');
  assert.equal(parseHandoff({ name: 'A', email: 'nope', question: 'q' }).error, 'email_invalid');
  assert.equal(parseHandoff({ name: 'A', email: 'a@b.co,c@d.co', question: 'q' }).error, 'email_invalid');
  assert.equal(parseHandoff({ name: '', email: 'a@b.co', question: 'q' }).error, 'name_required');
  assert.equal(parseHandoff({ name: 'A', email: 'a@b.co', question: '' }).error, 'question_required');
  assert.equal(parseHandoff({ name: 'A', email: 'a@b.co', question: 'q', website: 'http://spam' }).spam, true);
});

// ---------- reply reading ----------

test('readReply strips the handoff marker and flags it', () => {
  const r = readReply(okReply(`I am not sure about that.\n${HANDOFF_MARKER}`));
  assert.deepEqual(r, { reply: 'I am not sure about that.', handoff: true });
  assert.deepEqual(readReply(okReply('Yes, it works offline.')), { reply: 'Yes, it works offline.', handoff: false });
});

test('readReply drops an unfinished last sentence when the token limit cut the reply', () => {
  const full = 'This app has many pages to color and letters to learn. It works offline once installed. See https://play.google.com/store/apps/details?id=com.islam';
  const r = readReply({ stop_reason: 'max_tokens', content: [{ type: 'text', text: full }] });
  assert.equal(r.reply, 'This app has many pages to color and letters to learn. It works offline once installed.');
  assert.equal(readReply({ stop_reason: 'end_turn', content: [{ type: 'text', text: full }] }).reply, full);
});

test('the token limit leaves room for Arabic replies', () => {
  assert.ok(MAX_TOKENS >= 1200);
});

test('readReply turns a refusal or an empty reply into a handoff, without text', () => {
  assert.equal(readReply({ stop_reason: 'refusal', content: [] }).handoff, true);
  assert.equal(readReply(okReply('   ')).reply, '');
});

// ---------- HTTP behaviour ----------

test('chat: calls the model with the cached system prompt, low effort, fallbacks, and returns the reply', async () => {
  const calls = [];
  const res = await handle(post('/chat', { messages: [{ role: 'user', content: 'Is Islamic Coloring free?' }] }), baseEnv, deps(okReply('There are 42 free items.'), calls));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'There are 42 free items.', handoff: false });
  const p = calls[0];
  assert.equal(p.model, 'claude-opus-5-5');
  assert.equal(p.system[0].cache_control.type, 'ephemeral');
  assert.ok(p.system[0].text.includes('KNOWLEDGE'));
  assert.deepEqual(p.output_config, { effort: 'low' });
  assert.equal(p.fallbacks, 'default');
  assert.ok(p.betas.includes('server-side-fallback-2026-07-01'));
  assert.ok(p.max_tokens >= 1200 && p.max_tokens <= 2000);
  assert.equal('thinking' in p, false);
  assert.equal('temperature' in p, false);
  assert.equal(p.messages.at(-1).content, 'Is Islamic Coloring free?');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('chat: the visitor sees the handoff flag, never the marker', async () => {
  const res = await handle(post('/chat', { messages: [{ role: 'user', content: 'My purchase failed' }] }), baseEnv, deps(okReply(`Please write to the studio.\n${HANDOFF_MARKER}`)));
  const body = await res.json();
  assert.equal(body.handoff, true);
  assert.ok(!body.reply.includes('[['));
});

test('chat: no keys means a fallback answer, not an error page', async () => {
  const res = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }), { ...baseEnv, ANTHROPIC_API_KEY: '' });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { fallback: true, code: 'not_configured' });
});

test('kill switch: CHAT_ENABLED=false turns both endpoints off', async () => {
  const env = { ...baseEnv, CHAT_ENABLED: 'false' };
  for (const path of ['/chat', '/handoff']) {
    const res = await handle(post(path, { messages: [{ role: 'user', content: 'hi' }] }), env);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'disabled');
  }
});

test('upstream failure gives a fallback and leaks nothing', async () => {
  const failing = { createClient: () => ({ beta: { messages: { create: async () => { throw new Error('secret test-key detail'); } } } }) };
  const res = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }), baseEnv, failing);
  assert.equal(res.status, 502);
  const text = await res.text();
  assert.ok(!text.includes('secret') && !text.includes('test-key'));
  assert.equal(JSON.parse(text).fallback, true);
});

test('CORS: only the site origins may post; preflight is answered', async () => {
  const bad = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }, { origin: 'https://evil.example' }), baseEnv, deps(okReply('x')));
  assert.equal(bad.status, 403);
  const none = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }, { origin: null }), baseEnv, deps(okReply('x')));
  assert.equal(none.status, 403);
  const www = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }, { origin: 'https://www.kevroapps.com' }), baseEnv, deps(okReply('x')));
  assert.equal(www.status, 200);
  const pre = await handle(new Request('https://x/chat', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), baseEnv);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const preBad = await handle(new Request('https://x/chat', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), baseEnv);
  assert.equal(preBad.status, 403);
});

test('rate limit: the 21st chat request in a minute is refused', async () => {
  let last;
  for (let i = 0; i < 21; i++) last = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }), baseEnv, deps(okReply('x')));
  assert.equal(last.status, 429);
  assert.equal((await last.json()).code, 'rate_limited');
  const other = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }, { ip: '9.9.9.9' }), baseEnv, deps(okReply('x')));
  assert.equal(other.status, 200);
});

test('rate limit: the Cloudflare binding can refuse too', async () => {
  const env = { ...baseEnv, RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const res = await handle(post('/chat', { messages: [{ role: 'user', content: 'hi' }] }), env, deps(okReply('x')));
  assert.equal(res.status, 429);
});

test('bad bodies get a 400 and never reach the model', async () => {
  const calls = [];
  const a = await handle(post('/chat', 'not json'), baseEnv, deps(okReply('x'), calls));
  assert.equal(a.status, 400);
  const b = await handle(post('/chat', { messages: [] }), baseEnv, deps(okReply('x'), calls));
  assert.equal(b.status, 400);
  assert.equal(calls.length, 0);
});

test('handoff: sends one email to support with the visitor as Reply-To', async () => {
  const sent = [];
  const fakeFetch = async (url, init) => { sent.push({ url, init }); return new Response('{}', { status: 200 }); };
  const res = await handle(
    post('/handoff', { name: 'Aisha', email: 'aisha@example.com', question: 'Will there be an iPhone version?', lang: 'en', page: '/apps/', transcript: [{ role: 'user', content: 'hi' }] }),
    baseEnv, { fetch: fakeFetch });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal(sent[0].init.headers.Authorization, 'Bearer test-resend');
  const mail = JSON.parse(sent[0].init.body);
  assert.deepEqual(mail.to, ['support@kevroapps.com']);
  assert.equal(mail.reply_to, 'aisha@example.com');
  assert.equal(mail.from, 'Kevro Apps website <chat@send.kevroapps.com>');
  assert.match(mail.text, /Will there be an iPhone version\?/);
  assert.match(mail.text, /Visitor: hi/);
  assert.ok(!mail.subject.includes('\n'));
});

test('handoff: header injection in the name cannot add recipients or lines', () => {
  const data = parseHandoff({ name: 'Eve\r\nBcc: boss@example.com', email: 'eve@example.com', question: 'q' });
  const mail = buildEmail(baseEnv, data);
  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.deepEqual(mail.to, ['support@kevroapps.com']);
});

test('handoff: honeypot is answered as success but sends nothing', async () => {
  let called = 0;
  const res = await handle(post('/handoff', { name: 'Bot', email: 'b@b.co', question: 'q', website: 'x' }), baseEnv, { fetch: async () => { called++; return new Response('{}'); } });
  assert.equal(res.status, 200);
  assert.equal(called, 0);
});

test('handoff: missing Resend key or a failed send gives a fallback', async () => {
  const body = { name: 'A', email: 'a@b.co', question: 'q' };
  const none = await handle(post('/handoff', body), { ...baseEnv, RESEND_API_KEY: '' });
  assert.equal(none.status, 503);
  const failed = await handle(post('/handoff', body), baseEnv, { fetch: async () => new Response('no', { status: 500 }) });
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).code, 'email_failed');
});

test('handoff: at most three emails an hour per visitor', async () => {
  const body = { name: 'A', email: 'a@b.co', question: 'q' };
  const d = { fetch: async () => new Response('{}', { status: 200 }) };
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await handle(post('/handoff', body), baseEnv, d)).status);
  assert.deepEqual(codes, [200, 200, 200, 429]);
});

test('health reports on and configured state without leaking secrets', async () => {
  const res = await handle(new Request('https://x/health', { headers: { Origin: ORIGIN } }), baseEnv);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { ok: true, enabled: true, chat: true, email: true });
  assert.ok(!text.includes('test-key') && !text.includes('test-resend'));
  const empty = await handle(new Request('https://x/health'), { ALLOWED_ORIGINS: '' });
  assert.deepEqual(await empty.json(), { ok: true, enabled: true, chat: false, email: false });
});

test('unknown paths and methods are 404', async () => {
  assert.equal((await handle(new Request('https://x/nope', { method: 'POST', headers: { Origin: ORIGIN } }), baseEnv)).status, 404);
  assert.equal((await handle(new Request('https://x/chat', { method: 'GET', headers: { Origin: ORIGIN } }), baseEnv)).status, 404);
});
