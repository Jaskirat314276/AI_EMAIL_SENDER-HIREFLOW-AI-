import db from '../db.js';

const DEFAULT_TZ = process.env.QUEUE_TIMEZONE
  || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// 'YYYY-MM-DD' for "now" in the given IANA tz (en-CA formats as 2026-07-08).
export function localDay(tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function getSettings(userId) {
  let s = db.prepare(`SELECT * FROM queue_settings WHERE user_id=?`).get(userId);
  if (!s) {
    db.prepare(`INSERT INTO queue_settings (user_id, timezone) VALUES (?, ?)`)
      .run(userId, DEFAULT_TZ);
    s = db.prepare(`SELECT * FROM queue_settings WHERE user_id=?`).get(userId);
  }
  if (!s.timezone) s.timezone = DEFAULT_TZ;
  return s;
}

export function setStatus(userId, status) {
  getSettings(userId); // ensure row exists
  db.prepare(`UPDATE queue_settings SET status=?, updated_at=datetime('now') WHERE user_id=?`)
    .run(status, userId);
}

function clampInt(v, dflt, lo, hi) {
  const n = Number.isFinite(+v) ? Math.round(+v) : dflt;
  return Math.max(lo, Math.min(hi, n));
}

// A settable IANA timezone must be one Intl accepts; otherwise localDay() throws on every
// worker tick and status read, permanently stalling the queue. Reject invalid input.
function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return true; } catch { return false; }
}

export function updateSettings(userId, patch) {
  const s = getSettings(userId);
  const min = clampInt(patch.min_delay_ms, s.min_delay_ms, 1000, 3600000);
  let   max = clampInt(patch.max_delay_ms, s.max_delay_ms, 1000, 3600000);
  if (max < min) max = min;
  const cap = clampInt(patch.daily_cap, s.daily_cap, 1, 2000);
  const tz  = isValidTimeZone(patch.timezone) ? patch.timezone : s.timezone;
  db.prepare(`UPDATE queue_settings
    SET min_delay_ms=?, max_delay_ms=?, daily_cap=?, timezone=?, updated_at=datetime('now')
    WHERE user_id=?`).run(min, max, cap, tz, userId);
  return getSettings(userId);
}

export function sentToday(userId, tz) {
  return db.prepare(`
    SELECT COUNT(*) AS n FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status='sent' AND s.sent_day=?
  `).get(userId, localDay(tz)).n;
}

export function counts(userId) {
  const rows = db.prepare(`
    SELECT s.status AS st, COUNT(*) AS n FROM sends s
    JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? GROUP BY s.status
  `).all(userId);
  const out = { draft: 0, queued: 0, sending: 0, sent: 0, failed: 0 };
  for (const r of rows) if (r.st in out) out[r.st] = r.n;
  return out;
}

// Enqueue all drafts (+ optionally failed) for a user. Returns number queued.
export function enqueueAll(userId, { includeFailed = false } = {}) {
  const statuses = includeFailed ? `('draft','failed')` : `('draft')`;
  const info = db.prepare(`
    UPDATE sends SET status='queued', queued_at=datetime('now'), error=NULL
    WHERE status IN ${statuses}
      AND recipient_id IN (SELECT id FROM recipients WHERE user_id=?)
  `).run(userId);
  if (info.changes > 0) {
    db.prepare(`UPDATE recipients SET status='queued'
      WHERE user_id=? AND id IN (SELECT recipient_id FROM sends WHERE status='queued')`).run(userId);
  }
  return info.changes;
}

// Enqueue a specific set of recipients' drafts (+ optionally failed). Returns number queued.
export function enqueueSome(userId, recipientIds, { includeFailed = false } = {}) {
  const ids = (Array.isArray(recipientIds) ? recipientIds : []).map(Number).filter(Number.isInteger);
  if (!ids.length) return 0;
  const ph = ids.map(() => '?').join(',');
  const statuses = includeFailed ? `('draft','failed')` : `('draft')`;
  const info = db.prepare(`
    UPDATE sends SET status='queued', queued_at=datetime('now'), error=NULL
    WHERE status IN ${statuses}
      AND recipient_id IN (${ph})
      AND recipient_id IN (SELECT id FROM recipients WHERE user_id=?)
  `).run(...ids, userId);
  if (info.changes > 0) {
    db.prepare(`UPDATE recipients SET status='queued'
      WHERE user_id=? AND id IN (SELECT recipient_id FROM sends WHERE status='queued')`).run(userId);
  }
  return info.changes;
}

// How many of the given recipients are enqueueable (draft, or failed if included).
export function countEnqueueable(userId, recipientIds, includeFailed = false) {
  const ids = (Array.isArray(recipientIds) ? recipientIds : []).map(Number).filter(Number.isInteger);
  if (!ids.length) return 0;
  const ph = ids.map(() => '?').join(',');
  const statuses = includeFailed ? `('draft','failed')` : `('draft')`;
  return db.prepare(`SELECT COUNT(*) AS n FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status IN ${statuses} AND s.recipient_id IN (${ph})`).get(userId, ...ids).n;
}

// Atomically claim the next queued send for a user. Returns row + recipient, or null.
export const claimNext = db.transaction((userId) => {
  const row = db.prepare(`
    SELECT s.id AS send_id, s.subject, s.body, r.id AS recipient_id, r.email AS to_email
    FROM sends s JOIN recipients r ON r.id=s.recipient_id
    WHERE r.user_id=? AND s.status='queued'
    ORDER BY RANDOM() LIMIT 1
  `).get(userId);
  if (!row) return null;
  const upd = db.prepare(`UPDATE sends SET status='sending', locked_at=datetime('now'),
    attempts=attempts+1 WHERE id=? AND status='queued'`).run(row.send_id);
  return upd.changes === 1 ? row : null; // guard: lost the race (impossible single-worker, but safe)
});

export function markSent(sendId, recipientId, gmailMsgId, tz) {
  const day = localDay(tz);
  const tx = db.transaction(() => {
    db.prepare(`UPDATE sends SET status='sent', sent_at=datetime('now'), sent_day=?,
      gmail_msg_id=?, error=NULL, locked_at=NULL WHERE id=?`).run(day, gmailMsgId, sendId);
    db.prepare(`UPDATE recipients SET status='sent' WHERE id=?`).run(recipientId);
    db.prepare(`INSERT INTO events (send_id, type, meta) VALUES (?, 'sent', ?)`)
      .run(sendId, JSON.stringify({ gmail_msg_id: gmailMsgId }));
  });
  tx();
}

export function markFailed(sendId, recipientId, message) {
  const tx = db.transaction(() => {
    db.prepare(`UPDATE sends SET status='failed', error=?, locked_at=NULL WHERE id=?`)
      .run(message, sendId);
    db.prepare(`UPDATE recipients SET status='failed' WHERE id=?`).run(recipientId);
    db.prepare(`INSERT INTO events (send_id, type, meta) VALUES (?, 'failed', ?)`)
      .run(sendId, JSON.stringify({ error: message }));
  });
  tx();
}

// Boot recovery: any 'sending' row was interrupted by a restart → fail it (never double-send).
export function recoverInterrupted() {
  const info = db.prepare(`UPDATE sends SET status='failed',
    error='interrupted — check Gmail Sent, then requeue', locked_at=NULL
    WHERE status='sending'`).run();
  if (info.changes > 0) {
    db.prepare(`UPDATE recipients SET status='failed' WHERE id IN
      (SELECT recipient_id FROM sends WHERE error LIKE 'interrupted%')`).run();
  }
  return info.changes;
}

export function randomDelay(s) {
  const lo = Math.min(s.min_delay_ms, s.max_delay_ms);
  const hi = Math.max(s.min_delay_ms, s.max_delay_ms);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// Race a promise against a timeout so a hung Gmail send can't block the worker forever.
export function withTimeout(promise, ms, label = 'Operation') {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
