import { google } from 'googleapis';

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

function emailFromIdToken(idToken) {
  if (!idToken) return null;
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  return payload.email || null;
}

export async function exchangeCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email = emailFromIdToken(tokens.id_token);
  if (!email) {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    email = data.email;
  }
  return { tokens, email };
}

export function clientForTokens(googleTokensJson) {
  const client = createOAuthClient();
  client.setCredentials(JSON.parse(googleTokensJson));
  return client;
}
