import express from 'express';
import db from '../db.js';
import { getAuthUrl, exchangeCode } from '../services/google.js';
import { COOKIE_NAME, currentUser } from '../lib/auth.js';

const router = express.Router();

router.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`OAuth error: ${error}`);
  if (!code) return res.status(400).send('Missing code');

  try {
    const { tokens, email } = await exchangeCode(code);

    const existing = db.prepare('SELECT id, google_tokens FROM users WHERE email = ?').get(email);
    let userId;

    if (existing) {
      userId = existing.id;
      const merged = tokens.refresh_token
        ? tokens
        : { ...JSON.parse(existing.google_tokens || '{}'), ...tokens };
      db.prepare('UPDATE users SET google_tokens = ? WHERE id = ?')
        .run(JSON.stringify(merged), userId);
    } else {
      const info = db.prepare('INSERT INTO users (email, google_tokens) VALUES (?, ?)')
        .run(email, JSON.stringify(tokens));
      userId = info.lastInsertRowid;
    }

    res.cookie(COOKIE_NAME, String(userId), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const frontend = process.env.CORS_ORIGIN || 'http://localhost:5173';
    res.redirect(`${frontend}/?connected=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error('[oauth callback]', err);
    res.status(500).send(`OAuth callback failed: ${err.message}`);
  }
});

router.get('/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.json({ connected: false });
  res.json({
    connected: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

export default router;
