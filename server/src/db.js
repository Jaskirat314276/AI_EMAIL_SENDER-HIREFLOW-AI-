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
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT,
    email           TEXT,
    company         TEXT,
    role            TEXT,
    linkedin        TEXT,
    extra           TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_user_email ON recipients(user_id, email);
`);

// Migrations gated by user_version pragma — they run once per DB.
const SCHEMA_VERSION = 2;
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

if (currentVersion < SCHEMA_VERSION) {
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sends (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id    INTEGER UNIQUE REFERENCES recipients(id) ON DELETE CASCADE,
    subject         TEXT,
    body            TEXT,
    gmail_msg_id    TEXT,
    status          TEXT DEFAULT 'draft',
    sent_at         TEXT,
    error           TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sends_recipient ON sends(recipient_id);

  CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    send_id         INTEGER REFERENCES sends(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    meta            TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_send ON events(send_id);
`);

export default db;
