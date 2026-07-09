import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../data/hireflow.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Base tables (fresh-DB shape). Existing DBs get any missing columns via the
// --- guarded PRAGMA user_version migrations below; nothing here rewrites data.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    google_tokens   TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT,
    email             TEXT,
    phone             TEXT,
    location          TEXT,
    target_role       TEXT,
    summary           TEXT,
    skills_json       TEXT,
    experience_json   TEXT,
    projects_json     TEXT,
    links_json        TEXT,
    subject_template  TEXT,
    body_template     TEXT,
    updated_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipients (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name               TEXT,
    email              TEXT,
    company            TEXT,
    role               TEXT,
    linkedin           TEXT,
    apply_role         TEXT,
    contact_type       TEXT,
    designation_source TEXT,
    extra              TEXT,
    status             TEXT DEFAULT 'pending',
    created_at         TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_user_email ON recipients(user_id, email);
`);

// Migrations gated by user_version pragma — they run once per DB.
const SCHEMA_VERSION = 3;
const currentVersion = db.pragma('user_version', { simple: true });

if (currentVersion < 1) {
  // v1: drop legacy campaign-based tables
  db.exec(`
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS sends;
    DROP TABLE IF EXISTS leads;
    DROP TABLE IF EXISTS campaigns;
  `);
}

if (currentVersion < 2) {
  // v2: add template columns to profiles if upgrading from an older DB
  const cols = db.prepare(`PRAGMA table_info(profiles)`).all().map((c) => c.name);
  if (!cols.includes('subject_template')) db.exec(`ALTER TABLE profiles ADD COLUMN subject_template TEXT`);
  if (!cols.includes('body_template'))    db.exec(`ALTER TABLE profiles ADD COLUMN body_template TEXT`);
}

// Tables that v1 may have dropped — (re)create with the current (v3) shape.
// On an existing DB these are no-ops (IF NOT EXISTS); the v3 ALTER block below
// adds any missing columns to pre-existing sends/recipients.
db.exec(`
  CREATE TABLE IF NOT EXISTS sends (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id    INTEGER UNIQUE REFERENCES recipients(id) ON DELETE CASCADE,
    subject         TEXT,
    body            TEXT,
    gmail_msg_id    TEXT,
    status          TEXT DEFAULT 'draft',
    attempts        INTEGER NOT NULL DEFAULT 0,
    queued_at       TEXT,
    locked_at       TEXT,
    sent_day        TEXT,
    sent_at         TEXT,
    error           TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sends_recipient ON sends(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_sends_status ON sends(status);

  CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    send_id         INTEGER REFERENCES sends(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    meta            TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_send ON events(send_id);

  CREATE TABLE IF NOT EXISTS applications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id    INTEGER UNIQUE NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    replied         INTEGER NOT NULL DEFAULT 0,
    replied_at      TEXT,
    replied_from    TEXT,
    oa              INTEGER NOT NULL DEFAULT 0,
    oa_at           TEXT,
    r1              INTEGER NOT NULL DEFAULT 0,
    r1_at           TEXT,
    r2              INTEGER NOT NULL DEFAULT 0,
    r2_at           TEXT,
    r3              INTEGER NOT NULL DEFAULT 0,
    r3_at           TEXT,
    result          TEXT NOT NULL DEFAULT 'open',
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_applications_recipient ON applications(recipient_id);

  CREATE TABLE IF NOT EXISTS queue_settings (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    min_delay_ms  INTEGER NOT NULL DEFAULT 60000,
    max_delay_ms  INTEGER NOT NULL DEFAULT 120000,
    daily_cap     INTEGER NOT NULL DEFAULT 40,
    timezone      TEXT,
    status        TEXT NOT NULL DEFAULT 'idle',
    updated_at    TEXT DEFAULT (datetime('now'))
  );
`);

if (currentVersion < 3) {
  // v3: applied-for role + contact designation on recipients; queue columns on sends.
  const rcols = db.prepare(`PRAGMA table_info(recipients)`).all().map((c) => c.name);
  if (!rcols.includes('apply_role'))         db.exec(`ALTER TABLE recipients ADD COLUMN apply_role TEXT`);
  if (!rcols.includes('contact_type'))       db.exec(`ALTER TABLE recipients ADD COLUMN contact_type TEXT`);
  if (!rcols.includes('designation_source')) db.exec(`ALTER TABLE recipients ADD COLUMN designation_source TEXT`);

  const scols = db.prepare(`PRAGMA table_info(sends)`).all().map((c) => c.name);
  if (!scols.includes('attempts'))  db.exec(`ALTER TABLE sends ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`);
  if (!scols.includes('queued_at')) db.exec(`ALTER TABLE sends ADD COLUMN queued_at TEXT`);
  if (!scols.includes('locked_at')) db.exec(`ALTER TABLE sends ADD COLUMN locked_at TEXT`);
  if (!scols.includes('sent_day'))  db.exec(`ALTER TABLE sends ADD COLUMN sent_day TEXT`);

  // Backfill: one tracker row per existing recipient (idempotent).
  db.exec(`INSERT OR IGNORE INTO applications (recipient_id) SELECT id FROM recipients;`);
}

// Index on the queue columns — created after the v3 ALTERs guarantee `queued_at` exists
// (on a fresh DB the column comes from CREATE TABLE; on a pre-v3 DB it is added above).
db.exec(`CREATE INDEX IF NOT EXISTS idx_sends_queue ON sends(status, queued_at);`);

if (currentVersion < SCHEMA_VERSION) {
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

export default db;
