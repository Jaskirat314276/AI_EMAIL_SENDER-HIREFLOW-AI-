import express from 'express';
import db from '../db.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();

// Valid contact designations (mirrors services/designation.js ENUM).
const CONTACT_TYPES = new Set(['hr', 'recruiter', 'exec', 'founder', 'other']);

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
    db.prepare('INSERT OR IGNORE INTO applications (recipient_id) VALUES (?)').run(info.lastInsertRowid);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Recipient with this email already exists' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const existing = db.prepare('SELECT * FROM recipients WHERE id = ? AND user_id = ?')
    .get(req.params.id, user.id);
  if (!existing) return res.status(404).json({ error: 'Recipient not found' });

  const FIELDS = ['name', 'email', 'company', 'role', 'linkedin', 'apply_role', 'contact_type'];
  const patch = {};
  for (const k of FIELDS) if (k in (req.body || {})) patch[k] = req.body[k] ?? '';
  if ('contact_type' in patch && patch.contact_type && !CONTACT_TYPES.has(patch.contact_type)) {
    return res.status(400).json({ error: `Invalid contact_type: ${patch.contact_type}` });
  }
  // A manual contact_type edit overrides any automatic designation classification.
  if ('contact_type' in patch) patch.designation_source = 'manual';
  if (Object.keys(patch).length === 0) return res.json({ ok: true, recipient: existing });

  const set = Object.keys(patch).map((k) => `${k} = @${k}`).join(', ');
  try {
    db.prepare(`UPDATE recipients SET ${set} WHERE id = @id AND user_id = @user_id`)
      .run({ ...patch, id: existing.id, user_id: user.id });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Another recipient already uses this email' });
    }
    throw err;
  }

  const recipient = db.prepare('SELECT * FROM recipients WHERE id = ?').get(existing.id);
  res.json({ ok: true, recipient });
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
