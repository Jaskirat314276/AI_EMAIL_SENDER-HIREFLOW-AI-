import express from 'express';
import db from '../db.js';
import { currentUser } from '../lib/auth.js';
import { getProfile } from '../services/profile.js';
import { sendViaGmail } from '../services/gmail-send.js';

const router = express.Router();

router.post('/test', async (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  try {
    const profile = getProfile(user.id);
    const result = await sendViaGmail({
      user,
      profile,
      to: user.email,
      subject: '[HireFlow] Test — sending works',
      body: `Hi ${profile.name || 'there'},\n\nThis is a test email from HireFlow AI confirming that Gmail sending is wired up correctly.\n\nIf you can read this, your account ${user.email} is authorized and ready to send personalized outreach.\n\n— HireFlow`,
    });
    res.json({ ok: true, sent_to: user.email, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:recipient_id', async (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { dry_run = false } = req.body || {};

  const recipient = db.prepare('SELECT * FROM recipients WHERE id = ? AND user_id = ?')
    .get(req.params.recipient_id, user.id);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const send = db.prepare('SELECT * FROM sends WHERE recipient_id = ?').get(recipient.id);
  if (!send) return res.status(400).json({ error: 'No draft. Generate first.' });
  if (send.status === 'sent') return res.status(400).json({ error: 'Already sent' });

  if (dry_run) {
    return res.json({
      ok: true,
      dry_run: true,
      preview: { to: recipient.email, subject: send.subject, body: send.body },
    });
  }

  try {
    const profile = getProfile(user.id);
    const result = await sendViaGmail({
      user, profile,
      to: recipient.email,
      subject: send.subject,
      body: send.body,
    });

    db.prepare(`UPDATE sends SET status='sent', sent_at=datetime('now'), gmail_msg_id=?, error=NULL WHERE id=?`)
      .run(result.gmail_msg_id, send.id);
    db.prepare(`UPDATE recipients SET status='sent' WHERE id=?`).run(recipient.id);

    res.json({ ok: true, gmail_msg_id: result.gmail_msg_id, sent_to: recipient.email });
  } catch (err) {
    db.prepare(`UPDATE sends SET status='failed', error=? WHERE id=?`).run(err.message, send.id);
    db.prepare(`UPDATE recipients SET status='failed' WHERE id=?`).run(recipient.id);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { dry_run = false, throttle_ms = 8000 } = req.body || {};

  const drafts = db.prepare(`
    SELECT s.*, r.email AS to_email, r.name AS to_name, r.id AS recipient_id
    FROM sends s
    JOIN recipients r ON r.id = s.recipient_id
    WHERE r.user_id = ? AND s.status = 'draft'
    ORDER BY s.id
  `).all(user.id);

  if (drafts.length === 0) {
    return res.status(400).json({ error: 'No drafts to send. Generate first.' });
  }

  if (dry_run) {
    return res.json({
      ok: true,
      dry_run: true,
      would_send: drafts.length,
      previews: drafts.map((d) => ({
        recipient_id: d.recipient_id, to: d.to_email, subject: d.subject,
      })),
    });
  }

  const profile = getProfile(user.id);
  const results = [];

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    try {
      const result = await sendViaGmail({
        user, profile, to: d.to_email, subject: d.subject, body: d.body,
      });
      db.prepare(`UPDATE sends SET status='sent', sent_at=datetime('now'), gmail_msg_id=?, error=NULL WHERE id=?`)
        .run(result.gmail_msg_id, d.id);
      db.prepare(`UPDATE recipients SET status='sent' WHERE id=?`).run(d.recipient_id);
      results.push({ recipient_id: d.recipient_id, to: d.to_email, ok: true, gmail_msg_id: result.gmail_msg_id });
    } catch (err) {
      db.prepare(`UPDATE sends SET status='failed', error=? WHERE id=?`).run(err.message, d.id);
      db.prepare(`UPDATE recipients SET status='failed' WHERE id=?`).run(d.recipient_id);
      results.push({ recipient_id: d.recipient_id, to: d.to_email, ok: false, error: err.message });
    }

    if (i < drafts.length - 1 && throttle_ms > 0) {
      await new Promise((r) => setTimeout(r, throttle_ms));
    }
  }

  res.json({
    ok: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    total: results.length,
    results,
  });
});

export default router;
