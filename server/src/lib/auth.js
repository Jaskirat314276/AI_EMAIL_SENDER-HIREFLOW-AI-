import db from '../db.js';

export const COOKIE_NAME = 'uid';

function parseCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export function currentUser(req) {
  const uid = parseCookie(req.headers.cookie, COOKIE_NAME);
  if (!uid) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
}

export function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated. Connect Gmail at /auth/google' });
  req.user = user;
  next();
}
