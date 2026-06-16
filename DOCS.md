# HireFlow AI — Project Documentation

> AI-powered cold email outreach platform for job seekers.
> Upload a list of recruiters, AI personalizes an email per recruiter using your profile, then sends through your own Gmail.

---

## Table of contents
1. [What it does](#1-what-it-does)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Repository layout](#3-repository-layout)
4. [Tech stack](#4-tech-stack)
5. [End-to-end flow](#5-end-to-end-flow)
6. [Frontend](#6-frontend)
7. [Backend](#7-backend)
8. [Database](#8-database)
9. [AI / LLM layer](#9-ai--llm-layer)
10. [Authentication (Gmail OAuth)](#10-authentication-gmail-oauth)
11. [Profile system](#11-profile-system)
12. [Environment variables](#12-environment-variables)
13. [How to run locally](#13-how-to-run-locally)
14. [Status — done vs remaining](#14-status--done-vs-remaining)
15. [Design decisions & tradeoffs](#15-design-decisions--tradeoffs)

---

## 1. What it does

A job seeker provides:
- **Their profile** (skills, experience, projects) — seeded once from a resume, editable later.
- **A list of recruiters** (CSV/XLSX with name, email, company, role).

The system:
- Stores the recruiters in a database.
- For each recruiter, calls an LLM to write a personalized cold email that mentions:
  - the recruiter by first name,
  - their company,
  - the most relevant 1–2 projects from the sender's profile,
  - measurable impact (metrics, numbers),
  - the sender's portfolio URL.
- Saves drafts in the database for user review.
- (Coming next) Sends them through the user's own Gmail account so they look personal.

---

## 2. Architecture at a glance

```
┌──────────────────────┐         ┌────────────────────────────┐
│  Browser (Vite/React)│ ──────▶ │  Express server :4000      │
│  localhost:5173      │ cookies │  ───────────────────────── │
│  - Profile page      │         │  /auth   /profile          │
│  - Recipients page   │         │  /upload /recipients       │
│                      │         │  /generate /sends          │
└──────────────────────┘         └────────────────────────────┘
                                          │           │
                                          │           │
                                 ┌────────▼───┐   ┌───▼──────────┐
                                 │  SQLite    │   │  Groq API    │
                                 │  hireflow  │   │  Llama 3.3   │
                                 │  .db       │   │  70B         │
                                 └────────────┘   └──────────────┘
                                          │
                                 ┌────────▼─────────┐
                                 │  Google Gmail    │
                                 │  API (OAuth)     │
                                 │  *send via user* │
                                 └──────────────────┘
```

One Express service handles everything. No microservices, no message queue, no Redis — kept intentionally minimal for a prototype.

---

## 3. Repository layout

```
AI-EMAIL-SENDER/
├── DOCS.md                       ← you are here
├── index.html                    ← Vite entry (loads src/main.jsx)
├── package.json                  ← frontend deps (React, recharts, lucide-react)
├── vite.config.js
├── tailwind.config.js / postcss.config.js
├── hireflow-ai-prototype.jsx     ← original visual prototype (reference only)
├── JASKIRAT_RESUME_SDE_M.pdf     ← source for default profile seed
│
├── src/                          ← frontend source
│   ├── main.jsx                  ← mounts App
│   ├── App.jsx                   ← top-level: auth gate + view router
│   ├── index.css                 ← Tailwind base
│   ├── api.js                    ← all backend fetch calls
│   ├── design.js                 ← color/font tokens
│   ├── components/               ← shared UI atoms (Btn, Pill, Sidebar, TopBar)
│   └── views/                    ← page-level components
│       ├── Profile.jsx
│       └── Recipients.jsx
│
└── server/                       ← backend (Express)
    ├── package.json              ← backend deps
    ├── .env                      ← secrets (gitignored)
    ├── .env.example
    ├── data/
    │   └── hireflow.db           ← SQLite file (gitignored)
    └── src/
        ├── index.js              ← Express entry, mounts routes
        ├── db.js                 ← SQLite schema + migrations
        ├── lib/
        │   ├── auth.js           ← cookie parsing, currentUser, requireAuth
        │   └── profile-seed.js   ← default profile (from resume)
        ├── services/
        │   ├── parser.js         ← CSV/XLSX → recipients
        │   ├── google.js         ← Gmail OAuth client
        │   ├── llm.js            ← Groq API + prompt
        │   └── profile.js        ← profile read/write + auto-seed
        └── routes/
            ├── auth.js           ← /auth/google, /auth/me, /auth/logout
            ├── profile.js        ← GET/PUT /profile
            ├── upload.js         ← POST /upload
            ├── recipients.js     ← CRUD on recipients
            └── generate.js       ← /preview, /generate, PUT /sends/:id
```

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Fast dev loop, the visual prototype was already React |
| Charts | recharts | Already used in the prototype |
| Icons | lucide-react | Clean, tree-shakeable |
| Backend | Node.js 18 + Express | Smallest possible HTTP server, matches Vite frontend (one language) |
| DB | SQLite via `better-sqlite3` | Zero-config, file-based, synchronous (no async noise) |
| Email transport | Gmail API via `googleapis` | Sends as the user's real Gmail → best cold-outreach deliverability |
| LLM | Groq + Llama 3.3 70B | Free tier, very fast, no quota surprises (Gemini failed for us with `limit:0`) |
| File parsing | `papaparse` (CSV), `xlsx` (Excel) | Handles header variations |
| Auth | OAuth 2.0 + signed cookie | No JWT, no full session store — one cookie holds the user id |

---

## 5. End-to-end flow

```
1. User opens http://localhost:5173/
   └─ App calls GET /auth/me. If not connected, shows "Connect Gmail" CTA.

2. User clicks Connect Gmail.
   └─ Browser hits GET /auth/google → 302 → Google OAuth consent.
   └─ Google redirects back to GET /auth/google/callback?code=...
   └─ Server exchanges code for tokens, decodes id_token for email,
      stores tokens in `users.google_tokens` (JSON), sets cookie `uid=<userId>`.
   └─ Browser is redirected to http://localhost:5173/?connected=<email>.

3. User opens the Profile page.
   └─ GET /profile. First-ever call lazily seeds DEFAULT_PROFILE (from resume).
      The seed includes `subject_template` and `body_template` containing
      placeholders like {{first_name}} and {{company}}.
   └─ User edits any field (or the template itself) → PUT /profile saves.

4. User uploads recipients (CSV/XLSX).
   └─ POST /upload multipart, field `file`.
   └─ Server parses, normalises columns (Name/Full Name, Email/E-mail, etc.),
      validates emails, inserts into `recipients` table (per-user, unique by email).
   └─ Returns counts: parsed / added / duplicates_updated / invalid_skipped.

5. User clicks "Compose emails".
   └─ POST /generate { mode: 'template' }  (template is the default mode)
   └─ Server loads the user's profile, iterates over recipients, runs the
      stored `subject_template` and `body_template` through services/render.js
      which does pure {{placeholder}} substitution — NO LLM call, deterministic.
   └─ Upserts into `sends` table as status='draft', marks recipient.status='drafted'.
   └─ Returns array of { recipient_id, subject, body, cached }.

   Alternative (kept as fallback): mode: 'ai' calls Groq for per-recipient rewriting.
   Same upsert, just expensive and non-deterministic. Off by default.

6. User reviews drafts in the table, optionally edits a draft.
   └─ PUT /sends/:recipient_id with new {subject, body}.

7. User clicks Send (single) or Send all drafts (bulk).
   └─ POST /send/:recipient_id  OR  POST /send  (bulk, throttled ~8s apart)
   └─ Server uses stored google_tokens, builds RFC 2822 MIME, base64url-encodes,
      calls gmail.users.messages.send → records gmail_msg_id, flips
      sends.status to 'sent', stamps sent_at, updates recipients.status='sent'.
   └─ Test send (POST /send/test) is available for safe verification (delivers to self).
```

---

## 6. Frontend

### Vite + React 18

`index.html` loads `/src/main.jsx`, which mounts `<App />` into `#root`.

### Files

| File | Purpose |
|---|---|
| `src/main.jsx` | React root + Tailwind import |
| `src/App.jsx` | Auth gate (calls `/auth/me`), sidebar, view router |
| `src/api.js` | Single source of truth for backend calls (`api.profile.get()`, `api.recipients.list()`, etc.). Every fetch uses `credentials: 'include'` so the auth cookie travels. |
| `src/design.js` | Dark-mocha color palette + serif/sans/mono font stacks (extracted from the visual prototype) |
| `src/components/Btn.jsx` | Primary / ghost / dark buttons with hover lift |
| `src/components/Pill.jsx` | Status badges |
| `src/components/Sidebar.jsx` | Left nav (Recipients / Profile) |
| `src/components/TopBar.jsx` | Page header with eyebrow + title + actions |
| `src/views/Profile.jsx` | Editable form of profile fields (skills as chips, experience/projects as repeating blocks) |
| `src/views/Recipients.jsx` | File drop zone + recipients table + Generate / Send buttons + expandable preview |

### Auth gating

On mount, `App` calls `GET /auth/me`. Two outcomes:
- `{connected:false}` → render a "Connect Gmail" screen with a single button that opens `/auth/google` in a new tab.
- `{connected:true, user:{...}}` → render the sidebar + selected view.

After OAuth completes, Google redirects to `localhost:5173/?connected=<email>`. The App detects the query param and refetches `/auth/me`.

### Talking to the backend

All API calls go through `src/api.js`. CORS is set on the backend to allow `http://localhost:5173` with credentials, so the `uid` cookie flows automatically.

### Original prototype

`hireflow-ai-prototype.jsx` (the original 967-line single-file visual mockup) is left in the repo as a design reference but no longer imported. Its design tokens are the source for `src/design.js`.

---

## 7. Backend

### `server/src/index.js`

Plain Express. Loads `dotenv`, applies `cors` (with `credentials: true`), JSON body parser, then mounts routers:

| Router mount | File |
|---|---|
| `/auth` | `routes/auth.js` |
| `/profile` | `routes/profile.js` |
| `/upload` | `routes/upload.js` |
| `/recipients` | `routes/recipients.js` |
| `/` (root) | `routes/generate.js` — for `/preview`, `/generate`, `PUT /sends/:id` |

Plus `GET /health`.

### Endpoint catalog

#### Auth
| Method | Path | Behavior |
|---|---|---|
| GET | `/auth/google` | 302 to Google's OAuth consent URL (scopes: `openid`, `userinfo.email`, `gmail.send`) |
| GET | `/auth/google/callback` | Exchanges code for tokens, upserts user, sets `uid` cookie, redirects to frontend |
| GET | `/auth/me` | Returns `{connected:true, user:{...}}` or `{connected:false}` |
| POST | `/auth/logout` | Clears cookie |

#### Profile
| Method | Path | Behavior |
|---|---|---|
| GET | `/profile` | Returns current profile. Lazily seeds `DEFAULT_PROFILE` (from `lib/profile-seed.js`) on first call. |
| PUT | `/profile` | Merges `req.body` into existing profile, persists, returns updated profile |

#### Recipients
| Method | Path | Behavior |
|---|---|---|
| POST | `/upload` | multipart `file=<csv\|xlsx>`. Returns `{parsed, added, duplicates_updated, invalid_skipped}`. |
| GET | `/recipients` | List all recipients for the user, joined with their draft (if any) |
| POST | `/recipients` | Manually add a single recipient |
| DELETE | `/recipients/:id` | Delete one |
| DELETE | `/recipients` | Delete all |

#### Generation
| Method | Path | Behavior |
|---|---|---|
| POST | `/preview` | One-off preview (no DB write). Body: `{recipient:{...}, tone}` |
| POST | `/generate` | Generates drafts for all (or selected) recipients. Body: `{tone, regenerate, recipient_ids?}` |
| PUT | `/sends/:recipient_id` | Manually update a draft. Body: `{subject, body}` |

### Services

| Service | What it does |
|---|---|
| `services/parser.js` | Reads buffer, detects CSV vs XLSX, normalises headers (aliases for Name/Email/Company/Role/LinkedIn), filters invalid emails. |
| `services/google.js` | OAuth client + `getAuthUrl()`, `exchangeCode(code)` (returns `{tokens, email}` decoded from id_token), `clientForTokens(json)` for future Gmail sends. |
| `services/llm.js` | Builds prompt, calls Groq, parses `SUBJECT:` / `BODY:` from response. See section 9. |
| `services/profile.js` | `getProfile(userId)` with lazy seed, `updateProfile(userId, patch)`. Profile is stored partly as scalar columns and partly as JSON (skills, experience, projects, links). |

### Library files

| File | Purpose |
|---|---|
| `lib/auth.js` | `currentUser(req)` parses the `uid` cookie and looks up user. `requireAuth` middleware for guarded routes. |
| `lib/profile-seed.js` | The `DEFAULT_PROFILE` JS object — extracted from your resume PDF and portfolio site. |

---

## 8. Database

SQLite file at `server/data/hireflow.db`. WAL mode, foreign keys ON.

### Schema

```sql
users (
  id              INTEGER PK
  email           TEXT UNIQUE NOT NULL
  name            TEXT
  google_tokens   TEXT       -- JSON: {access_token, refresh_token, expiry_date, ...}
  created_at      TEXT
)

profiles (
  id                INTEGER PK
  user_id           INTEGER UNIQUE → users(id)
  name              TEXT
  email             TEXT
  phone             TEXT
  location          TEXT
  target_role       TEXT
  summary           TEXT
  skills_json       TEXT       -- JSON array of strings
  experience_json   TEXT       -- JSON array of {company,title,period,bullets[]}
  projects_json     TEXT       -- JSON array of {name,tech[],description,impact}
  links_json        TEXT       -- JSON {portfolio,linkedin,github,leetcode}
  subject_template  TEXT       -- e.g. "Application for software engineering roles at {{company}}"
  body_template     TEXT       -- multi-line, contains {{first_name}}, {{company}}, etc.
  updated_at        TEXT
)

recipients (
  id              INTEGER PK
  user_id         INTEGER → users(id)
  name            TEXT
  email           TEXT
  company         TEXT
  role            TEXT       -- the recruiter's job title (NOT the open role)
  linkedin        TEXT
  extra           TEXT       -- JSON of any unmapped CSV columns
  status          TEXT DEFAULT 'pending'   -- pending|drafted|sent|failed
  created_at      TEXT
  UNIQUE(user_id, email)
)

sends (
  id              INTEGER PK
  recipient_id    INTEGER UNIQUE → recipients(id)
  subject         TEXT
  body            TEXT
  gmail_msg_id    TEXT       -- set after a successful send
  status          TEXT DEFAULT 'draft'    -- draft|sent|failed
  sent_at         TEXT
  error           TEXT
)

events (
  id              INTEGER PK
  send_id         INTEGER → sends(id)
  type            TEXT       -- 'open' | 'click' | 'reply' (reserved for chunk 6+)
  meta            TEXT
  created_at      TEXT
)
```

### Schema evolution

Migrations are tracked via SQLite's `user_version` pragma (current `SCHEMA_VERSION = 2`). Each version's block runs once per DB; later restarts no-op.

| Version | What it does |
|---|---|
| v1 | Drops legacy `campaigns`, `leads`, `events`, `sends` tables (left over from the original template-based-campaign design). Recreates `sends` and `events` against the new recipient-centric model. |
| v2 | Adds `subject_template` and `body_template` columns to `profiles` via `ALTER TABLE` (idempotent — checks `PRAGMA table_info` before altering). |

The auto-seed in `services/profile.js → getProfile()` backfills empty template columns for profiles created before v2.

### Indexes

- `recipients(user_id)`
- `recipients(user_id, email)` — unique (no duplicate emails per user)
- `sends(recipient_id)` — unique (one draft per recipient)
- `events(send_id)`

---

## 9. Email composition layer

Two modes available. **Template (default)** is used in production; **AI** is kept as opt-in fallback.

### Mode 1 — Template (default)

`services/render.js` does pure `{{placeholder}}` substitution against the user's stored `subject_template` and `body_template` (fields on the profile).

**Supported placeholders:**
```
{{name}}        {{first_name}}    {{last_name}}
{{email}}       {{company}}       {{role}}        {{linkedin}}
```

Unknown placeholders are left untouched (e.g. `{{compny}}`) so the user can spot typos.

**Why this is the right default for cold outreach:**
- Deterministic — the same template produces identical content every time
- The user controls every word
- Zero API calls, zero rate limits, zero surprise wording
- Professional and consistent — recruiters generally don't want creative-writing variance, they want clarity

The default template (seeded from the user's resume) introduces them, names the role they're applying for, mentions their internship + flagship projects with metrics, and signs off with their portfolio URL. Two placeholder swaps per email: `{{first_name}}` and `{{company}}`.

### Mode 2 — AI (optional, off by default)

Kept as an alternative for users who want per-recipient generative variation. Pass `mode: 'ai'` to `/generate` or `/preview`.

**Provider:** Groq + `llama-3.3-70b-versatile` via Groq's OpenAI-compatible REST endpoint.

| Spec | Value |
|---|---|
| Free tier | 30 req/min, 14,400/day |
| Speed | ~600 tokens/sec |
| Quality | ~95% of GPT-4o-mini for short structured-writing tasks |

We tried Google Gemini first, but our OAuth project received `limit: 0` allocation on the free tier (Google quirk for some accounts). Switched to Groq.

**Output format:** plain `SUBJECT:` / `BODY:` blocks (not JSON) — Llama models kept wrapping JSON in markdown fences which Groq's strict-JSON validator rejected. `services/llm.js` parses with a regex.

### Caching

`/generate` checks if a draft already exists for each recipient. If yes and `regenerate=false`, returns the cached version. Pass `regenerate:true` to force re-render.

### Switching modes

Per request:
```bash
curl -X POST /generate -d '{"mode":"template"}'     # default
curl -X POST /generate -d '{"mode":"ai","tone":"Direct"}'
```

To make AI the default again, change `mode = 'template'` to `mode = 'ai'` in `routes/generate.js`.

---

## 10. Authentication (Gmail OAuth)

### Why Gmail OAuth (not Resend/SendGrid)

Cold outreach lands in inboxes only if it comes from a real Gmail. Transactional providers (Resend, SendGrid, Mailgun) work for newsletters but go to spam for unsolicited recruiter outreach. Gmail OAuth lets the app send *as the user*, from their real address, with their real DKIM/SPF signature.

### Scopes requested

```
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/gmail.send
```

The first two let us identify the user (decode `id_token` for their email). The third lets us send mail.

### Flow (detail)

```
1. Browser → GET /auth/google
   └─ Server returns 302 to https://accounts.google.com/o/oauth2/v2/auth?...
      with access_type=offline (so we get a refresh_token) and prompt=consent.

2. User picks account → Google warns about unverified app
   (testing mode is fine for personal use; verification is for >100 external users).

3. User clicks Allow → Google → GET /auth/google/callback?code=<one-time>
   └─ Server calls client.getToken(code) → gets {access_token, refresh_token, ...}.
   └─ Decodes id_token (JWT, base64) to extract `email`.
   └─ Upserts `users` row. If user already existed and the new exchange omits a
      refresh_token (Google sometimes does this on re-consent), we keep the existing
      refresh_token by merging.
   └─ Sets HTTP cookie `uid=<userId>` (httpOnly, sameSite=lax, 30-day maxAge).
   └─ Redirects to http://localhost:5173/?connected=<email>.

4. Future requests carry the `uid` cookie. lib/auth.currentUser(req) reads it and
   looks up the user row (with stored google_tokens).
```

### Token refresh

The Google OAuth client (`googleapis`) auto-refreshes the access token when it sees a 401. The `refresh_token` is what makes this work without re-asking the user. As long as we never lose the refresh_token, the connection lasts.

### Cookie design

We use a single bare cookie `uid=<userId>` — not a JWT, not a session store. This is fine for a single-server prototype. For multi-server / production we'd use signed cookies + an actual session store (Redis or DB-backed).

---

## 11. Profile system

### Storage shape

A profile mixes scalar columns (queryable basics like `name`, `email`, `target_role`, `subject_template`, `body_template`) with JSON blobs for variable-length lists (`skills`, `experience`, `projects`, `links`). This balance lets us evolve the inner shape (e.g., add a `start_date` field to experience entries) without DB migrations.

### Auto-seeding

The first time `GET /profile` is hit for a user, the server inserts `DEFAULT_PROFILE` from `lib/profile-seed.js`. That seed was extracted from the user's resume PDF + portfolio website. It includes a sensible default email template. The user can edit anything via `PUT /profile`.

If a profile exists but its template fields are empty (created before v2 migration), `getProfile()` backfills them from `DEFAULT_PROFILE`.

### How the profile flows into emails

**Template mode (default):**
- `services/render.js → renderEmail({profile, recipient})` reads `profile.subject_template` and `profile.body_template`, runs `{{placeholder}}` substitution against the recipient's fields.
- Same output every time for the same input.

**AI mode (opt-in):**
- `services/llm.js → formatProfile(profile)` produces a compact text block (skills, experience, projects, portfolio URL) which is passed to the LLM along with the recipient's details. LLM rewrites the email per recipient.

In both modes, the profile is the single source of truth — edit once, every email reflects the change.

---

## 12. Environment variables

`server/.env` (template at `server/.env.example`):

| Var | Required | Default | What |
|---|---|---|---|
| `PORT` | — | `4000` | HTTP port |
| `DATABASE_PATH` | — | `./data/hireflow.db` | SQLite file |
| `CORS_ORIGIN` | — | `http://localhost:5173` | Frontend origin allowed |
| `GOOGLE_CLIENT_ID` | yes (for OAuth) | — | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | yes | — | same |
| `GOOGLE_REDIRECT_URI` | — | `http://localhost:4000/auth/google/callback` | Must match what's registered in Google Console |
| `GROQ_API_KEY` | yes (for AI) | — | From https://console.groq.com → API Keys |

The frontend has no env file — it talks to `http://localhost:4000` hard-coded in `src/api.js`. (Easy to switch to a Vite proxy or env var later.)

---

## 13. How to run locally

### Prereqs
- Node.js 18+
- A Google Cloud project with Gmail API enabled and OAuth credentials configured
- A Groq API key

### One-time setup

```bash
# Frontend deps
cd /Users/jaskiratsingh/Downloads/AI-EMAIL-SENDER
npm install

# Backend deps
cd server
npm install
cp .env.example .env
# fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GROQ_API_KEY in .env
```

### Run dev

Two terminals:

```bash
# Terminal 1 — backend
cd server
npm run dev          # auto-restarts on file changes

# Terminal 2 — frontend
cd ..                # back to repo root
npm run dev          # Vite on :5173
```

Open http://localhost:5173 → click **Connect Gmail** → consent → done.

### Useful curl tests

```bash
# health
curl -s http://localhost:4000/health

# After OAuth, forge a cookie for the only user
CK="uid=1"

# profile (auto-seeded on first call)
curl -s -H "Cookie: $CK" http://localhost:4000/profile | python3 -m json.tool

# upload a CSV
curl -s -H "Cookie: $CK" -F "file=@sample.csv" http://localhost:4000/upload

# list recipients
curl -s -H "Cookie: $CK" http://localhost:4000/recipients

# generate
curl -s -H "Cookie: $CK" -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{"tone":"Direct","regenerate":true}'
```

---

## 14. Status — done vs remaining

### ✅ Done
- **Backend service** running on `:4000`, all routes wired (`/auth`, `/profile`, `/upload`, `/recipients`, `/generate`, `/preview`, `/sends/:id`, `/send/test`, `/send/:id`, `/send`)
- **Gmail OAuth** connect flow (scopes: openid, userinfo.email, gmail.send). Verified — tokens persisted in `users.google_tokens`.
- **CSV/XLSX upload** with smart column aliasing (Name/Full Name, Email/E-mail, Company/Organization, Role/Title, LinkedIn/Profile).
- **Recipients CRUD** (per-user, unique by email).
- **Profile auto-seeding** from the user's resume PDF + portfolio website. Full editor on the frontend (basics, summary, skills as chips, experience with bullets, projects with tech tags, links).
- **Email Template editor** in Profile — subject + body with `{{first_name}} {{company}}` placeholders. Default template seeded from resume content.
- **Template-based composition** via `services/render.js` (deterministic mail-merge). Default mode.
- **LLM fallback** via Groq + Llama 3.3 70B (opt-in `mode: 'ai'`). Robust SUBJECT/BODY parser.
- **Gmail sending** — single (`/send/:id`), bulk with throttle (`/send`), test-to-self (`/send/test`). MIME built with UTF-8 + encoded-word headers, base64url-encoded for Gmail API. Verified — real email landed in inbox (msg id `19e5551ad688b172` on 2026-05-23).
- **Draft caching** (regenerate flag), `sent` status persists across restarts (after fixing the migration to gate DROP TABLE behind `user_version`).
- **Frontend** — auth gate → Sidebar with Profile + Recipients views. Per-row expand to preview email. Send / Send All / Test send buttons. Toast feedback.
- **Documentation** (this file) — kept in sync with code as of 2026-05-24.

### 🔜 Next session (open items)
- **Verify the template flow in the browser** — user closed the tab before final UI check. Open http://localhost:5173, regenerate, expand any recipient, confirm `Hi <first_name>, ... at <Company>` appears with their resume content verbatim.
- **Real send against a real recipient** — the fake recipients (priya@productimate.io etc.) will bounce. User should upload a CSV with their own Gmail as the recipient, generate, then click Send to do a full live test.
- **Edit the seeded template** — the default body is the resume autobiography; user may want to tighten it. Profile page → Email Template section.

### ⬜ Future polish
- Open-tracking pixel (`GET /track/open/:sendId.png`)
- Click-tracking redirects
- Reply detection via IMAP polling or Gmail watch
- Per-recipient send scheduling (working hours, time zones)
- Multi-user support (currently single user per server; cookies are unsigned and trivially forgeable)
- Production hardening: signed cookies, rate limiting, error reporting, HTTPS, CSP
- Per-recipient template overrides (e.g., a second template for different role types)
- Background-job processing for bulk sends (current bulk send blocks the HTTP request for `8s × N`)

---

## 15. Design decisions & tradeoffs

| Decision | Why | Tradeoff |
|---|---|---|
| **One Express monolith** instead of microservices | Solo project, low traffic, simpler to reason about | Will need to split if usage grows or we add async jobs |
| **SQLite** instead of Postgres | Zero setup, single file | Hard to scale beyond one machine; concurrent write contention |
| **Gmail OAuth** instead of Resend/SendGrid | Cold outreach deliverability | Per-user setup friction; rate-limited by Gmail's anti-abuse |
| **Groq** instead of Gemini/OpenAI/Claude | Free tier that actually works, fast | Free tier could change; rate limits cap volume |
| **JSON columns** for profile lists | No schema migrations as profile shape evolves | Can't index/query inside the JSON easily |
| **No template/campaign concept** | Simpler mental model — you have one profile, one list, one click | If a user wants two parallel pipelines (e.g., FE + BE roles), they currently can't |
| **SUBJECT:/BODY: text format** for LLM output | More reliable than JSON with this model | Less structured, can't add fields without parser change |
| **Single bare cookie** for auth | No JWT/session store complexity | Trivially forgeable in HTTP (not HTTPS); fine for localhost dev only |
| **Sync `better-sqlite3`** instead of async ORM | Simpler code, no await noise | Blocks the event loop on big queries; not an issue at our scale |
| **Template-based composition** as the default (was LLM-based) | User wants the script to be the same every time, only name/company swapped. Professional and predictable. LLM kept as opt-in fallback for users who want generative variation. | Loses per-recipient nuance the LLM was producing. Mitigated by the user being able to edit the template directly. |
| **`user_version` pragma** for migrations instead of a `_migrations` table | Built into SQLite, zero extra code | Only supports linear integer versions — no branching schemas |
