import express from 'express';
import db from '../db.js';
import { currentUser } from '../lib/auth.js';
import { getProfile } from '../services/profile.js';
import { sendViaGmail } from '../services/gmail-send.js';
import * as q from '../services/queue.js';
import { wake } from '../services/worker.js';

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

// --- Paced send queue ---------------------------------------------------------
// Literal routes MUST be declared before '/:recipient_id' (Express matches top-down).

// Enqueue all drafts (+ optionally failed) and start the queue. Non-blocking.
// Shared by canonical POST /send/queue and back-compat bulk POST /send.
function enqueue(req, res) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const { dry_run = false, include_failed = false, recipient_ids = null } = req.body || {};
  const subset = Array.isArray(recipient_ids) && recipient_ids.length > 0;

  if (dry_run) {
    const c = q.counts(user.id);
    const would = subset
      ? q.countEnqueueable(user.id, recipient_ids, include_failed)
      : c.draft + (include_failed ? c.failed : 0);
    return res.json({ ok: true, dry_run: true, would_queue: would, counts: c });
  }

  const queued = subset
    ? q.enqueueSome(user.id, recipient_ids, { includeFailed: include_failed })
    : q.enqueueAll(user.id, { includeFailed: include_failed });
  if (queued === 0) {
    return res.status(400).json({
      error: subset ? 'None of the selected recipients are sendable drafts.' : 'No drafts to queue. Generate first.',
    });
  }
  q.setStatus(user.id, 'running');
  wake();
  res.json({ ok: true, queued, status: 'running' });
}

router.post('/queue', enqueue);

router.post('/pause', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  q.setStatus(user.id, 'paused');
  res.json({ ok: true, status: 'paused' });
});

router.post('/resume', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  q.setStatus(user.id, 'running');
  wake();
  res.json({ ok: true, status: 'running' });
});

router.post('/cancel', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const info = db.prepare(`UPDATE sends SET status='canceled', locked_at=NULL
    WHERE status='queued' AND recipient_id IN (SELECT id FROM recipients WHERE user_id=?)`)
    .run(user.id);
  if (info.changes > 0) {
    db.prepare(`UPDATE recipients SET status='canceled'
      WHERE user_id=? AND id IN (SELECT recipient_id FROM sends WHERE status='canceled')`)
      .run(user.id);
  }
  q.setStatus(user.id, 'idle');
  res.json({ ok: true, canceled: info.changes });
});

router.get('/queue/status', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const s = q.getSettings(user.id);
  const c = q.counts(user.id);
  const sent_today = q.sentToday(user.id, s.timezone);
  const sending = db.prepare(`SELECT s.recipient_id, r.email AS to_email, r.name
    FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status='sending' LIMIT 1`).get(user.id) || null;
  // Rows sending unusually long → surfaced to the UI as "stuck" toasts.
  const stuck = db.prepare(`
    SELECT s.recipient_id, r.email AS to_email, r.name,
      CAST((julianday('now') - julianday(s.locked_at)) * 86400 AS INT) AS seconds
    FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status='sending' AND s.locked_at IS NOT NULL
      AND (julianday('now') - julianday(s.locked_at)) * 86400 >= 25
  `).all(user.id);
  // Most-recent terminal sends → the UI diffs these to pop sent/failed toasts.
  const recent = db.prepare(`
    SELECT s.recipient_id, r.email AS to_email, r.name, s.status, s.error,
      COALESCE(s.sent_at, s.locked_at) AS ts
    FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status IN ('sent','failed')
    ORDER BY COALESCE(s.sent_at, s.locked_at) DESC, s.id DESC
    LIMIT 25
  `).all(user.id);
  res.json({
    ok: true,
    status: s.status, // idle | running | paused
    counts: c, // {draft,queued,sending,sent,failed}
    remaining: c.queued + c.sending,
    sent_today,
    daily_cap: s.daily_cap,
    cap_remaining: Math.max(0, s.daily_cap - sent_today),
    local_day: q.localDay(s.timezone),
    settings: {
      min_delay_ms: s.min_delay_ms,
      max_delay_ms: s.max_delay_ms,
      daily_cap: s.daily_cap,
      timezone: s.timezone,
    },
    currently_sending: sending,
    stuck,
    recent,
  });
});

router.put('/queue/settings', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const settings = q.updateSettings(user.id, req.body || {});
  res.json({ ok: true, settings });
});

// --- Manual single send -------------------------------------------------------

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
  if (send.status === 'queued' || send.status === 'sending')
    return res.status(409).json({ error: 'Recipient is in the send queue' });

  if (dry_run) {
    return res.json({
      ok: true,
      dry_run: true,
      preview: { to: recipient.email, subject: send.subject, body: send.body },
    });
  }

  // Atomically claim this draft before the await, so a double-click or a concurrent
  // enqueue can't send the same email twice (mirrors the queue worker's claimNext).
  const claimed = db.prepare(
    `UPDATE sends SET status='sending', locked_at=datetime('now'), attempts=attempts+1
       WHERE id=? AND status NOT IN ('sent','queued','sending')`,
  ).run(send.id);
  if (claimed.changes !== 1) {
    return res.status(409).json({ error: 'Recipient is already being sent' });
  }

  const tz = q.getSettings(user.id).timezone;
  try {
    const profile = getProfile(user.id);
    const result = await q.withTimeout(sendViaGmail({
      user, profile,
      to: recipient.email,
      subject: send.subject,
      body: send.body,
    }), 45000, 'Gmail send');
    q.markSent(send.id, recipient.id, result.gmail_msg_id, tz);
    res.json({ ok: true, gmail_msg_id: result.gmail_msg_id, sent_to: recipient.email });
  } catch (err) {
    q.markFailed(send.id, recipient.id, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Back-compat bulk endpoint: now a non-blocking enqueue (was the blocking setTimeout loop).
router.post('/', enqueue);

export default router;
