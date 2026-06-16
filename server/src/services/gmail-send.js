import { google } from 'googleapis';
import { clientForTokens } from './google.js';

function encodeHeader(s) {
  if (!s) return '';
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function buildMime({ from, to, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ];
  return lines.join('\r\n');
}

function base64Url(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildFromAddress(user, profile) {
  const name = profile?.name || user?.name || '';
  const email = user.email;
  if (!name) return email;
  const encodedName = encodeHeader(name);
  return `${encodedName} <${email}>`;
}

export async function sendViaGmail({ user, profile, to, subject, body }) {
  if (!user?.google_tokens) throw new Error('User has no Gmail tokens (reconnect)');
  if (!to) throw new Error('Recipient email is required');
  if (!subject) throw new Error('Subject is required');
  if (!body) throw new Error('Body is required');

  const client = clientForTokens(user.google_tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const from = buildFromAddress(user, profile);
  const mime = buildMime({ from, to, subject, body });
  const raw = base64Url(mime);

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { gmail_msg_id: res.data.id, thread_id: res.data.threadId };
}
