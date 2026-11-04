export const LIMITS = {
  maxTurns: 12,          // messages kept per request (visitor and assistant together)
  maxMessageChars: 800,
  maxNameChars: 80,
  maxEmailChars: 120,
  maxQuestionChars: 1500,
  maxTranscriptChars: 1500,
};

const EMAIL = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

const clean = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
const oneLine = (s) => clean(s).replace(/\s+/g, ' ');

export function parseChat(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) return { error: 'messages_required' };
  const recent = body.messages.slice(-LIMITS.maxTurns);
  const messages = [];
  for (const m of recent) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return { error: 'bad_message' };
    const content = clean(m.content);
    if (!content) return { error: 'empty_message' };
    if (content.length > LIMITS.maxMessageChars) return { error: 'message_too_long' };
    messages.push({ role: m.role, content });
  }
  // The API needs the first turn to be the visitor's; trimming may have cut mid-pair.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  // Collapse accidental repeats of the same role so the request stays valid.
  const merged = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += '\n' + m.content;
    else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== 'user') return { error: 'last_must_be_user' };
  const lang = body.lang === 'ar' ? 'ar' : 'en';
  return { messages: merged, lang };
}

export function parseHandoff(body) {
  if (!body || typeof body !== 'object') return { error: 'bad_body' };
  // Honeypot: real visitors never see or fill this field.
  if (body.website) return { spam: true };
  const name = oneLine(body.name ?? '');
  const email = oneLine(body.email ?? '');
  const question = clean(body.question ?? '');
  if (!name) return { error: 'name_required' };
  if (name.length > LIMITS.maxNameChars) return { error: 'name_too_long' };
  if (!email || email.length > LIMITS.maxEmailChars || !EMAIL.test(email)) return { error: 'email_invalid' };
  if (!question) return { error: 'question_required' };
  if (question.length > LIMITS.maxQuestionChars) return { error: 'question_too_long' };
  const lang = body.lang === 'ar' ? 'ar' : 'en';
  const page = typeof body.page === 'string' ? oneLine(body.page).slice(0, 200) : '';
  let transcript = '';
  if (Array.isArray(body.transcript)) {
    transcript = body.transcript
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${clean(m.content)}`)
      .join('\n')
      .slice(0, LIMITS.maxTranscriptChars);
  }
  return { name, email, question, lang, page, transcript };
}
