<div align="center">

# ✉️ HireFlow AI

### AI-powered cold-email outreach for job seekers

Upload a list of recruiters, let AI personalize an email for each one from your profile, and send it through **your own Gmail** — so every message lands as a genuine, personal note.

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

## ✨ Features

- 📤 **Bulk recruiter import** — drop in a CSV/XLSX of names, emails, companies and roles.
- 🧠 **AI personalization** — each email names the recruiter, their company, your most relevant projects, and real measurable impact.
- 📝 **Template mail-merge first** — fast, deterministic templates by default, with **LLM generation as an opt-in fallback** (Groq · Llama 3.3 70B).
- 👤 **Reusable profile** — seed your skills, experience and projects once, edit anytime.
- 🔐 **Send as you** — Gmail OAuth means mail goes out from *your* account, not a relay.
- 🗂️ **Draft review** — every generated email is saved so you can review before it sends.

---

## 🏗️ Architecture

```
┌──────────────────────┐         ┌────────────────────────────┐
│  Browser (Vite/React)│ ──────▶ │  Express server :4000      │
│  localhost:5173      │ cookies │  /auth   /profile          │
│  Profile · Recipients│         │  /upload /recipients       │
│                      │         │  /generate /send           │
└──────────────────────┘         └──────────┬──────────┬──────┘
                                            │          │
                                     ┌──────▼────┐ ┌───▼────────┐
                                     │  SQLite   │ │  Groq API  │
                                     │ hireflow  │ │ Llama 3.3  │
                                     │   .db     │ │   70B      │
                                     └───────────┘ └────────────┘
                                            │
                                     ┌──────▼─────────┐
                                     │  Gmail API     │
                                     │  (OAuth 2.0)   │
                                     └────────────────┘
```

One Express service handles everything — no microservices, no queues, no Redis. Intentionally minimal.

---

## 🧱 Tech stack

| Layer        | Tools                                                        |
| ------------ | ----------------------------------------------------------- |
| **Frontend** | React 18 · Vite 5 · Tailwind CSS 3 · lucide-react · recharts |
| **Backend**  | Node.js · Express 4 · better-sqlite3                         |
| **Auth**     | Google OAuth 2.0 (`googleapis`)                             |
| **AI**       | Groq API — Llama 3.3 70B (opt-in)                            |
| **Parsing**  | papaparse · xlsx · multer                                    |

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
cp .env.example .env        # then fill in your credentials (see below)
npm run dev                 # → http://localhost:4000

# 3 — frontend (new terminal, from repo root)
npm install
npm run dev                 # → http://localhost:5173
```

### Environment variables (`server/.env`)

```ini
PORT=4000
DATABASE_PATH=./data/hireflow.db
CORS_ORIGIN=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
GROQ_API_KEY=
```

> 🔒 `.env` and the SQLite database are gitignored — secrets never leave your machine.

---

## 📁 Project structure

```
AI-EMAIL-SENDER/
├── index.html                  # Vite entry
├── src/                        # React frontend
│   ├── App.jsx                 # auth gate + view router
│   ├── api.js                  # backend fetch calls
│   ├── components/             # shared UI atoms (Btn, Pill, Sidebar, TopBar)
│   └── views/                  # Profile, Recipients
└── server/                     # Express backend
    └── src/
        ├── index.js            # entry, mounts routes
        ├── db.js               # SQLite schema + migrations
        ├── lib/                # auth helpers, profile seed
        ├── services/           # parser, google, llm, render, gmail-send
        └── routes/             # auth, profile, upload, recipients, generate, send
```

📖 Full design notes and decisions live in [`DOCS.md`](./DOCS.md).

---

## 🗺️ Roadmap

- [x] Recruiter import (CSV/XLSX)
- [x] Profile system with resume seed
- [x] Template mail-merge generation
- [x] Gmail OAuth + send
- [ ] Scheduled / throttled sending
- [ ] Open & reply tracking
- [ ] Multi-template A/B testing

---

<div align="center">
<sub>Built by <a href="https://github.com/Jaskirat314276">Jaskirat Singh</a></sub>
</div>
