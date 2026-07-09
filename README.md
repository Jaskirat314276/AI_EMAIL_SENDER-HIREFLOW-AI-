<div align="center">

# ✉️ HireFlow AI

### Your entire job-outreach pipeline, on autopilot.

Drop a spreadsheet of recruiters → HireFlow **extracts** and classifies every contact, **personalizes** an email from your profile, **sends** them at a human pace through **your own Gmail**, and **tracks** each application to the offer.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-Express-339933?logo=node.js&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Gmail OAuth" src="https://img.shields.io/badge/Gmail-OAuth%202.0-EA4335?logo=gmail&logoColor=white">
</p>

</div>

---

<div align="center">
  <img src="./docs/screenshot.png" alt="HireFlow AI — Connect your Gmail" width="820">
  <br>
  <sub><i>Send-as-you onboarding — HireFlow only ever requests the <code>gmail.send</code> scope.</i></sub>
</div>

---

## 🔀 The workflow

```
 Upload   →   Extract    →   Personalize   →   Review   →   Send (paced)   →   Track
 CSV/XLSX     columns +      mail-merge         edit         queue · random     per-contact
              classify       per contact        inline       order · capped     pipeline
```

---

## ✨ What it does

<table>
<tr>
<td width="50%" valign="top">

### 📥 Smart extraction
- Drop any **CSV / XLSX** — even messy ones (merged title banners, typo'd headers, honorifics).
- Auto-detects **company, contact, email, role** and the **role you're applying for**.
- **Classifies** each contact as HR / recruiter / exec / founder from title + email.

### 📝 Personalization, still human
- Template **mail-merge** by default: `{{first_name}}` `{{company}}` `{{apply_role}}` `{{contact_title}}` …
- Honorifics stripped, initials handled — *"Mr. R Murali"* → *"Hi R Murali,"*.
- **Groq · Llama 3.3 70B** as an opt-in generative fallback.

### ✍️ Review & edit
- Inline-edit any contact field **and** the drafted email before it sends.
- **Multi-select** rows or **pick N at random** to send just a subset.

</td>
<td width="50%" valign="top">

### 🚦 Paced send queue
- **DB-backed queue + background worker** — one at a time, in **random order**.
- **Configurable** delay + **daily cap** so Gmail never flags you.
- **Pause / resume / cancel**, restart-safe, and **never double-sends**.
- **Live toasts** — animated ✓ sent · ✗ failed · ⟳ in progress.

### 📊 Application tracker
- Every sent contact enters a **pipeline**: Replied → OA → R1 → R2 → R3 → Result.
- Reply-source, notes, and stage timestamps — inline, saved instantly.

### 🔐 Send as you
- **Gmail OAuth** — mail goes out from *your* account for best deliverability.
- Secrets and the local database never leave your machine.

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌───────────────────────────┐        ┌──────────────────────────────────────────┐
│  Browser · React + Vite   │ ─────▶ │  Express server  :4000                     │
│  localhost:5173           │ cookie │  /auth  /profile  /upload  /recipients     │
│  Recipients · Tracker      │        │  /generate  /send · /send/queue*  /tracker │
│  Profile                  │        └───────┬───────────────┬───────────┬────────┘
└───────────────────────────┘                │               │           │
                                    ┌─────────▼──────┐  ┌─────▼─────┐  ┌──▼─────────┐
                                    │  SQLite (WAL)  │  │  Groq API │  │  Gmail API │
                                    │  hireflow.db   │  │ Llama 3.3 │  │ (OAuth 2.0)│
                                    └───────┬────────┘  │ 70B (opt) │  └────────────┘
                                            │           └───────────┘
                                   ┌────────▼─────────┐
                                   │  Background      │  paced, capped,
                                   │  send worker     │  restart-safe drip
                                   └──────────────────┘
```

One Express service — no microservices, no Redis. The **send worker** is a single in-process singleton draining a DB-backed queue.

---

## 🧱 Tech stack

| Layer        | Tools                                                        |
| ------------ | ----------------------------------------------------------- |
| **Frontend** | React 18 · Vite 5 · Tailwind CSS 3 · lucide-react           |
| **Backend**  | Node.js · Express 4 · better-sqlite3 (WAL)                   |
| **Auth**     | Google OAuth 2.0 (`googleapis`)                             |
| **AI**       | Groq API — Llama 3.3 70B (opt-in)                           |
| **Parsing**  | papaparse · xlsx · multer                                    |

---

## 🧩 Modular structure

The UI is built from a small design-system of composable primitives; the backend splits cleanly into services (logic) and routes (HTTP).

```
src/                            # React frontend
├── App.jsx                     # auth gate + view switcher + ambient shell
├── api.js                      # typed backend client
├── design.js                  # theme tokens · gradients · shadows
├── index.css                  # motion system (keyframes + utilities)
├── components/                 # design system
│   ├── Card · StatTile · SectionHeader · Field
│   ├── Btn · Pill · Sidebar · TopBar
│   └── StatusMark · Toasts · QueuePanel     # animated send status
└── views/                      # Recipients · Tracker · Profile

server/src/                     # Express backend
├── index.js                    # entry · mounts routes · boots send worker
├── db.js                       # schema + migrations (user_version 3)
├── lib/                        # auth · profile-seed
├── services/                   # parser · designation · render · google
│                               # gmail-send · llm · queue · worker · profile
└── routes/                     # auth · profile · upload · recipients
                                # generate · send · tracker
```

---

## 🚀 Quick start

> **Prerequisites:** Node.js 18+, a Google Cloud OAuth client, and (optionally) a Groq API key.

```bash
# 1 — clone
git clone https://github.com/Jaskirat314276/AI_EMAIL_SENDER-HIREFLOW-AI-.git
cd AI_EMAIL_SENDER-HIREFLOW-AI-

# 2 — backend
cd server
npm install
cp .env.example .env        # fill in your credentials (below)
npm run dev                 # → http://localhost:4000

# 3 — frontend (new terminal, from repo root)
npm install
npm run dev                 # → http://localhost:5173
```

### Environment (`server/.env`)

```ini
PORT=4000
DATABASE_PATH=./data/hireflow.db
CORS_ORIGIN=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
GROQ_API_KEY=                # optional — only for the AI fallback
```

> 🔒 `.env` and the SQLite database are gitignored — secrets never leave your machine.
> The OAuth consent screen runs in **Testing** mode: add your Gmail as a **test user** in Google Cloud Console.

---

## 🗺️ Roadmap

- [x] Recruiter import (CSV / XLSX) with smart extraction + contact classification
- [x] Reusable profile + template mail-merge (LLM opt-in)
- [x] Inline review & edit · multi-select · random-N send
- [x] Paced, capped, restart-safe send queue with live status toasts
- [x] Per-contact application tracker
- [ ] **Resume builder** — tailor a resume per role and auto-attach it to each email *(see [`docs/LANDING_PAGE.md`](./docs/LANDING_PAGE.md))*
- [ ] Open & reply detection (IMAP / Gmail watch)

---

<div align="center">
<sub>Built by <a href="https://github.com/Jaskirat314276">Jaskirat Singh</a></sub>
</div>
