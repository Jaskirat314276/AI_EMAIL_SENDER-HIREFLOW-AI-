import db from '../db.js';
import { sendViaGmail } from './gmail-send.js';
import { getProfile } from './profile.js';
import * as q from './queue.js';

const IDLE_POLL_MS = 4000; // re-check cadence when idle / paused / capped
let timer = null;
let wakePending = false;
let ticking = false; // re-entrancy guard: at most one tick (one in-flight send) at a time

function schedule(ms) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, ms);
}

// External nudge (called by enqueue/resume endpoints) so we don't wait out IDLE_POLL_MS.
// If a tick is already running, don't start a second one — the running tick's `finally`
// re-checks `wakePending` and reschedules immediately, so the wake is never lost.
export function wake() {
  wakePending = true;
  if (!ticking) schedule(0);
}

async function tick() {
  wakePending = false;
  ticking = true;
  let nextMs = IDLE_POLL_MS;
  try {
    // Single-user prototype: pick the one running queue (generalizes to a loop over users).
    const s = db.prepare(`SELECT * FROM queue_settings WHERE status='running' LIMIT 1`).get();
    if (!s) return; // idle or paused → poll (finally reschedules)

    const userId = s.user_id;
    const tz = s.timezone || 'UTC';

    // Daily cap gate.
    if (q.sentToday(userId, tz) >= s.daily_cap) {
      q.setStatus(userId, 'idle'); // stop for the day; user (or resume) restarts
      return;
    }

    // Read the user (fresh Google tokens) + profile BEFORE claiming, so a read failure
    // leaves nothing claimed/stuck in 'sending'.
    const user = db.prepare(`SELECT * FROM users WHERE id=?`).get(userId);
    const profile = getProfile(userId);

    const claim = q.claimNext(userId); // atomic: queued → sending
    if (!claim) { // nothing left to send
      q.setStatus(userId, 'idle');
      return;
    }

    // Row is now 'sending' — resolve it to sent or failed either way.
    try {
      const r = await q.withTimeout(sendViaGmail({
        user, profile, to: claim.to_email, subject: claim.subject, body: claim.body,
      }), 45000, 'Gmail send');
      q.markSent(claim.send_id, claim.recipient_id, r.gmail_msg_id, tz);
    } catch (err) {
      q.markFailed(claim.send_id, claim.recipient_id, err.message);
    }

    // If we just hit the cap, idle; otherwise pace with jitter.
    nextMs = (q.sentToday(userId, tz) >= s.daily_cap) ? IDLE_POLL_MS : q.randomDelay(s);
  } catch (err) {
    console.error('[queue worker] tick error:', err);
    nextMs = IDLE_POLL_MS;
  } finally {
    ticking = false;
    schedule(wakePending ? 0 : nextMs);
  }
}

export function startWorker() {
  const recovered = q.recoverInterrupted();
  if (recovered) console.log(`[queue worker] recovered ${recovered} interrupted send(s) → failed`);
  console.log('[queue worker] started');
  schedule(1000); // first tick shortly after boot; auto-resumes any status='running' queue
}
