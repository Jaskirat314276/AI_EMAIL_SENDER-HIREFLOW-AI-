import express from 'express';
import db from '../db.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const rows = db.prepare(`
    SELECT r.*,
      s.subject AS draft_subject,
      s.body AS draft_body,
      s.status AS send_status,
      s.sent_at,
      s.error AS send_error
    FROM recipients r
    LEFT JOIN sends s ON s.recipient_id = r.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC, r.id DESC
  `).all(user.id);

  res.json({ recipients: rows });
});

router.post('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { name, email, company, role, linkedin } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const info = db.prepare(`
      INSERT INTO recipients (user_id, name, email, company, role, linkedin)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, name || '', email, company || '', role || '', linkedin || '');
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Recipient with this email already exists' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const info = db.prepare('DELETE FROM recipients WHERE id = ? AND user_id = ?')
    .run(req.params.id, user.id);
  res.json({ ok: true, deleted: info.changes });
});

router.delete('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const info = db.prepare('DELETE FROM recipients WHERE user_id = ?').run(user.id);
  res.json({ ok: true, deleted: info.changes });
});

export default router;
