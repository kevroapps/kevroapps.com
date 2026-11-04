// Sends one email to support@kevroapps.com through Resend. Nothing is stored by the Worker.
// Reply-To is the visitor, so pressing Reply in the mailbox answers them directly.

const RESEND_URL = 'https://api.resend.com/emails';

export function buildEmail(env, data) {
  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Language: ${data.lang === 'ar' ? 'Arabic' : 'English'}`,
    data.page ? `Page: ${data.page}` : null,
    '',
    'Question:',
    data.question,
  ].filter((l) => l !== null);
  if (data.transcript) lines.push('', 'Recent chat:', data.transcript);
  lines.push('', 'Sent from the chat assistant on kevroapps.com. Reply to this email to answer the visitor.');
  return {
    from: env.FROM_EMAIL,
    to: [env.SUPPORT_EMAIL],
    reply_to: data.email,
    subject: `Website chat: ${data.name}`.slice(0, 120),
    text: lines.join('\n'),
  };
}

export async function sendHandoff(env, data, fetchImpl = fetch) {
  const res = await fetchImpl(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEmail(env, data)),
  });
  if (!res.ok) throw new Error(`resend_${res.status}`);
  return true;
}
