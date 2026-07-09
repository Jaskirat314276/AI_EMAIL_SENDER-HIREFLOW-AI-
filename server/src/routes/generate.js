import express from 'express';
import db from '../db.js';
import { generatePersonalized } from '../services/llm.js';
import { renderEmail } from '../services/render.js';
import { getProfile } from '../services/profile.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();

router.post('/preview', async (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { recipient = {}, mode = 'template', tone = 'Direct' } = req.body || {};
  if (!recipient.name && !recipient.email) {
    return res.status(400).json({ error: 'recipient.name or recipient.email is required' });
  }

  try {
    const profile = getProfile(user.id);
    const out = mode === 'ai'
      ? await generatePersonalized({ profile, recipient, tone })
      : renderEmail({ profile, recipient });
    res.json({ ok: true, mode, ...out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { mode = 'template', tone = 'Direct', regenerate = false, recipient_ids = null } = req.body || {};

  let recipients;
  if (Array.isArray(recipient_ids) && recipient_ids.length) {
    const placeholders = recipient_ids.map(() => '?').join(',');
    recipients = db.prepare(`SELECT * FROM recipients WHERE user_id = ? AND id IN (${placeholders})`)
      .all(user.id, ...recipient_ids);
  } else {
    recipients = db.prepare(`SELECT * FROM recipients WHERE user_id = ? ORDER BY id`).all(user.id);
  }

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients found. Upload a CSV/XLSX first.' });
  }

  const profile = getProfile(user.id);
  if (mode === 'template' && !profile.body_template) {
    return res.status(400).json({ error: 'No email template set. Go to Profile → Email Template.' });
  }

  const existingSend = db.prepare(`SELECT id, subject, body, status FROM sends WHERE recipient_id = ?`);
  const upsert = db.prepare(`
    INSERT INTO sends (recipient_id, subject, body, status)
    VALUES (@recipient_id, @subject, @body, 'draft')
    ON CONFLICT(recipient_id) DO UPDATE SET
      subject=excluded.subject, body=excluded.body, status='draft', error=NULL
  `);
  const markDrafted = db.prepare(`UPDATE recipients SET status='drafted' WHERE id = ?`);

  const results = [];
  for (const r of recipients) {
    const has = existingSend.get(r.id);
    if (has && has.status === 'sent') {
      results.push({
        recipient_id: r.id, name: r.name, email: r.email, company: r.company,
        subject: has.subject, body: has.body, already_sent: true,
      });
      continue;
    }
    if (has && (has.status === 'queued' || has.status === 'sending')) {
      // Never reset a row the send queue owns back to 'draft' — that would drop it from
      // the current run or, with a re-enqueue, double-send it.
      results.push({
        recipient_id: r.id, name: r.name, email: r.email, company: r.company,
        subject: has.subject, body: has.body, in_queue: true,
      });
      continue;
    }
    if (has && !regenerate) {
      results.push({
        recipient_id: r.id, name: r.name, email: r.email, company: r.company,
        subject: has.subject, body: has.body, cached: true,
      });
      continue;
    }
    try {
      const out = mode === 'ai'
        ? await generatePersonalized({ profile, recipient: r, tone })
        : renderEmail({ profile, recipient: r });
      upsert.run({ recipient_id: r.id, subject: out.subject, body: out.body });
      markDrafted.run(r.id);
      results.push({
        recipient_id: r.id, name: r.name, email: r.email, company: r.company,
        ...out, cached: false,
      });
    } catch (err) {
      results.push({
        recipient_id: r.id, name: r.name, email: r.email, company: r.company,
        error: err.message,
      });
    }
  }

  res.json({
    ok: true,
    mode,
    generated: results.filter((x) => !x.error && !x.already_sent).length,
    total: results.length,
    results,
  });
});

router.put('/sends/:recipient_id', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });

  const recipient = db.prepare('SELECT id FROM recipients WHERE id = ? AND user_id = ?')
    .get(req.params.recipient_id, user.id);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  db.prepare(`
    INSERT INTO sends (recipient_id, subject, body, status)
    VALUES (?, ?, ?, 'draft')
    ON CONFLICT(recipient_id) DO UPDATE SET subject=excluded.subject, body=excluded.body
  `).run(recipient.id, subject, body);

  res.json({ ok: true });
});

export default router;
