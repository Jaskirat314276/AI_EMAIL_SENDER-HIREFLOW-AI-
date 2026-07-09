import express from 'express';
import db from '../db.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();

const RESULTS = new Set(['open', 'offer', 'accepted', 'rejected', 'ghosted', 'withdrawn']);
const STAGES = ['replied', 'oa', 'r1', 'r2', 'r3']; // each has a matching <stage>_at column
const TEXTABLE = ['replied_from', 'notes'];

// Shape a fresh recipient defaults to until it gets its first tracker edit.
const DEFAULTS = {
  replied: 0, replied_at: null, replied_from: null,
  oa: 0, oa_at: null,
  r1: 0, r1_at: null,
  r2: 0, r2_at: null,
  r3: 0, r3_at: null,
  result: 'open', notes: null,
};

// Tracker Row (BUILD_SPEC): recipient fields + send status + pipeline stages, coalesced to defaults.
const ROW_SQL = `
  SELECT
    r.id AS recipient_id, r.name, r.email, r.company, r.role, r.apply_role, r.contact_type,
    s.status AS send_status, s.sent_at,
    COALESCE(a.replied, 0) AS replied, a.replied_at, a.replied_from,
    COALESCE(a.oa, 0)      AS oa,      a.oa_at,
    COALESCE(a.r1, 0)      AS r1,      a.r1_at,
    COALESCE(a.r2, 0)      AS r2,      a.r2_at,
    COALESCE(a.r3, 0)      AS r3,      a.r3_at,
    COALESCE(a.result, 'open') AS result,
    a.notes, a.updated_at
  FROM recipients r
  LEFT JOIN sends s        ON s.recipient_id = r.id
  LEFT JOIN applications a ON a.recipient_id = r.id
`;

router.get('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  // Only contacts you've actually emailed belong in the pipeline — filter to sent.
  const applications = db.prepare(`
    ${ROW_SQL}
    WHERE r.user_id = ? AND s.status = 'sent'
    ORDER BY r.company COLLATE NOCASE, r.name COLLATE NOCASE, r.id
  `).all(user.id);

  res.json({ applications });
});

router.patch('/:recipient_id', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });

  const owned = db.prepare('SELECT id FROM recipients WHERE id = ? AND user_id = ?')
    .get(req.params.recipient_id, user.id);
  if (!owned) return res.status(404).json({ error: 'Recipient not found' });

  const patch = req.body || {};
  if ('result' in patch && !RESULTS.has(patch.result)) {
    return res.status(400).json({ error: `Invalid result: ${patch.result}` });
  }

  const cur = db.prepare('SELECT * FROM applications WHERE recipient_id = ?').get(owned.id)
    || { ...DEFAULTS, recipient_id: owned.id };
  const next = { ...cur };
  const now = () => db.prepare(`SELECT datetime('now') AS t`).get().t;

  // Stage checkboxes: flip the flag and manage its timestamp.
  // 0->1 sets now; 1->1 keeps the original; 1->0 clears it.
  for (const st of STAGES) {
    if (!(st in patch)) continue;
    const on = patch[st] ? 1 : 0;
    next[st] = on;
    next[`${st}_at`] = on ? (cur[`${st}_at`] || now()) : null;
  }
  if ('replied' in patch && !next.replied) next.replied_from = null; // unchecking replied clears channel
  if ('result' in patch) next.result = patch.result;
  for (const k of TEXTABLE) {
    if (k in patch) next[k] = (patch[k] ?? '').toString().slice(0, 4000) || null;
  }

  db.prepare(`
    INSERT INTO applications
      (recipient_id, replied, replied_at, replied_from, oa, oa_at,
       r1, r1_at, r2, r2_at, r3, r3_at, result, notes, updated_at)
    VALUES
      (@recipient_id, @replied, @replied_at, @replied_from, @oa, @oa_at,
       @r1, @r1_at, @r2, @r2_at, @r3, @r3_at, @result, @notes, datetime('now'))
    ON CONFLICT(recipient_id) DO UPDATE SET
      replied=excluded.replied, replied_at=excluded.replied_at, replied_from=excluded.replied_from,
      oa=excluded.oa, oa_at=excluded.oa_at,
      r1=excluded.r1, r1_at=excluded.r1_at, r2=excluded.r2, r2_at=excluded.r2_at,
      r3=excluded.r3, r3_at=excluded.r3_at,
      result=excluded.result, notes=excluded.notes, updated_at=excluded.updated_at
  `).run({
    recipient_id: owned.id,
    replied: next.replied, replied_at: next.replied_at, replied_from: next.replied_from,
    oa: next.oa, oa_at: next.oa_at,
    r1: next.r1, r1_at: next.r1_at,
    r2: next.r2, r2_at: next.r2_at,
    r3: next.r3, r3_at: next.r3_at,
    result: next.result, notes: next.notes,
  });

  const row = db.prepare(`${ROW_SQL} WHERE r.id = ?`).get(owned.id);
  res.json({ ok: true, row });
});

export default router;
