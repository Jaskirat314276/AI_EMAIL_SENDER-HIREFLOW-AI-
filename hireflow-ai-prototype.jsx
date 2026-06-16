import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Upload, BarChart3, Users, Sparkles, Send, Eye, Reply,
  ChevronRight, Plus, Search, LayoutDashboard, Settings, Clock,
  Play, Pause, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Zap, Edit3, RotateCw, Check, FileText, Inbox, MousePointerClick,
  Filter, Download, X, CornerDownRight, Briefcase
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────
const c = {
  bg: '#0c0a08',
  surface: '#15110d',
  surfaceHi: '#1d1813',
  border: '#2a231c',
  borderHi: '#3d352b',
  text: '#f5efe4',
  textDim: '#a39685',
  textMuted: '#6b6053',
  accent: '#e8a838',
  accentDim: '#9c7321',
  accentSoft: 'rgba(232, 168, 56, 0.12)',
  success: '#7ba368',
  successSoft: 'rgba(123, 163, 104, 0.15)',
  danger: '#c45a4a',
  info: '#6892b8',
};

const fDisplay = "'Instrument Serif', 'Times New Roman', serif";
const fBody = "'Inter Tight', -apple-system, system-ui, sans-serif";
const fMono = "'JetBrains Mono', ui-monospace, monospace";

// ─── MOCK DATA ──────────────────────────────────────────────────────
const seedLeads = [
  { name: 'Priya Sharma',   company: 'Productimate', role: 'Sr. HR Manager', email: 'priya@productimate.io', linkedin: '/in/priya-sharma',  status: 'queued' },
  { name: 'Aman Verma',     company: 'Quill Labs',   role: 'Talent Lead',    email: 'aman@quilllabs.so',    linkedin: '/in/amanverma',      status: 'queued' },
  { name: 'Ishita Roy',     company: 'Northwind',    role: 'People Ops',     email: 'ishita@northwind.co',  linkedin: '/in/ishita-r',       status: 'queued' },
  { name: 'Rohan Mehta',    company: 'Sable',        role: 'Head of Talent', email: 'rohan@sable.dev',      linkedin: '/in/rohanmehta',     status: 'queued' },
  { name: 'Kavya Iyer',     company: 'Lumen',        role: 'Recruiter',      email: 'kavya@lumen.studio',   linkedin: '/in/kavyaiyer',      status: 'queued' },
  { name: 'Dev Patel',      company: 'Folio',        role: 'HR Director',    email: 'dev@folio.app',        linkedin: '/in/devpatel',       status: 'queued' },
  { name: 'Anjali Nair',    company: 'Cinder',       role: 'Talent Partner', email: 'anjali@cinder.io',     linkedin: '/in/anjali-nair',    status: 'queued' },
  { name: 'Vikram Bose',    company: 'Halcyon',      role: 'Recruiting Mgr', email: 'vikram@halcyon.cc',    linkedin: '/in/vikrambose',     status: 'queued' },
];

const variations = [
  {
    tone: 'Direct',
    subject: 'Frontend engineer — built 3 SaaS dashboards last quarter',
    body: `Hi Priya,

I came across Productimate's recent Series A and the frontend roles you're hiring for. I'm a frontend engineer based in Ranchi with 2 years building production React/Next.js apps — most recently a campaign analytics tool that handled 40k events/day.

I'd love to be considered. Two-minute portfolio: jaskiratsingh.dev

Worth a quick call this week?

Jaskirat`,
    confidence: 92,
  },
  {
    tone: 'Conversational',
    subject: 'Loved the Productimate launch — quick hello',
    body: `Hey Priya,

Watched the Productimate launch video last week — the way you all handled the migration story was sharp. I do frontend work (React, Next.js, TypeScript) and noticed you're hiring on this side of the team.

Wanted to put my name in early. My recent work is at jaskiratsingh.dev — happy to walk through anything that's relevant.

Open to chatting?

— Jaskirat`,
    confidence: 87,
  },
  {
    tone: 'Bold',
    subject: 'I can help Productimate ship the dashboard 2x faster',
    body: `Priya —

Honest pitch: I spent the last 6 months rebuilding a SaaS dashboard from scratch in Next.js 15. Shipped it in 9 weeks, cut load time 64%, replaced 12 legacy screens.

Productimate is hiring frontend. I'd like a shot.

Portfolio + case study: jaskiratsingh.dev
30-min call this week?

Jaskirat`,
    confidence: 78,
  },
];

const sendsOverTime = [
  { d: 'Mon', sent: 42, opens: 18, replies: 3 },
  { d: 'Tue', sent: 51, opens: 24, replies: 5 },
  { d: 'Wed', sent: 48, opens: 21, replies: 4 },
  { d: 'Thu', sent: 56, opens: 28, replies: 7 },
  { d: 'Fri', sent: 39, opens: 16, replies: 4 },
  { d: 'Sat', sent: 12, opens: 4,  replies: 1 },
  { d: 'Sun', sent: 8,  opens: 2,  replies: 0 },
];

const templatePerf = [
  { t: 'Direct',          open: 58, reply: 14 },
  { t: 'Conversational',  open: 49, reply: 11 },
  { t: 'Bold',            open: 41, reply: 8  },
  { t: 'Follow-up #1',    open: 67, reply: 19 },
  { t: 'Follow-up #2',    open: 44, reply: 9  },
];

const campaigns = [
  { name: 'Frontend roles — Bangalore',  leads: 142, sent: 98, replies: 12, status: 'running' },
  { name: 'Product engineers — Remote',  leads: 88,  sent: 88, replies: 9,  status: 'paused'  },
  { name: 'Early-stage YC startups',     leads: 56,  sent: 23, replies: 4,  status: 'running' },
];

// ─── ATOMS ──────────────────────────────────────────────────────────
const Pill = ({ children, kind = 'neutral' }) => {
  const styles = {
    neutral: { bg: c.surfaceHi, fg: c.textDim, border: c.border },
    accent:  { bg: c.accentSoft, fg: c.accent, border: 'transparent' },
    success: { bg: c.successSoft, fg: c.success, border: 'transparent' },
    paused:  { bg: 'rgba(196,90,74,0.12)', fg: c.danger, border: 'transparent' },
  }[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: styles.bg, color: styles.fg,
        border: `1px solid ${styles.border}`,
        fontFamily: fMono, fontSize: 10.5, letterSpacing: '0.04em',
        textTransform: 'uppercase'
      }}
    >
      {kind === 'success' && <span style={{ width: 6, height: 6, borderRadius: 99, background: c.success, boxShadow: `0 0 8px ${c.success}` }}/>}
      {kind === 'paused' && <span style={{ width: 6, height: 6, borderRadius: 99, background: c.danger }}/>}
      {children}
    </span>
  );
};

const Stat = ({ label, value, delta, suffix, accent }) => (
  <div
    className="p-5 rounded-lg flex flex-col gap-3"
    style={{
      background: c.surface,
      border: `1px solid ${c.border}`,
    }}
  >
    <div className="flex items-center justify-between">
      <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {delta != null && (
        <span className="flex items-center gap-1 text-xs" style={{
          color: delta >= 0 ? c.success : c.danger, fontFamily: fMono
        }}>
          {delta >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          {Math.abs(delta)}%
        </span>
      )}
    </div>
    <div className="flex items-baseline gap-1">
      <span style={{ fontFamily: fDisplay, fontSize: 44, lineHeight: 1, color: accent ? c.accent : c.text, fontWeight: 400 }}>
        {value}
      </span>
      {suffix && <span style={{ color: c.textMuted, fontSize: 13 }}>{suffix}</span>}
    </div>
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', icon: Icon, size = 'md' }) => {
  const variants = {
    primary: { bg: c.accent, fg: '#1a1208', border: c.accent, hover: '#f0b449' },
    ghost:   { bg: 'transparent', fg: c.text, border: c.border, hover: c.surface },
    dark:    { bg: c.surfaceHi, fg: c.text, border: c.border, hover: c.border },
  }[variant];
  const sizes = { md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }[size];
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`${sizes} rounded-md inline-flex items-center gap-2 transition-all`}
      style={{
        background: hov ? variants.hover : variants.bg,
        color: variants.fg,
        border: `1px solid ${variants.border}`,
        fontFamily: fBody, fontWeight: 500,
        transform: hov ? 'translateY(-1px)' : 'none',
      }}
    >
      {Icon && <Icon size={14}/>}
      {children}
    </button>
  );
};

// ─── SIDEBAR ────────────────────────────────────────────────────────
const Sidebar = ({ view, setView }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload',    label: 'Leads',     icon: Users },
    { id: 'generator', label: 'Composer',  icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];
  return (
    <aside
      className="flex flex-col"
      style={{
        width: 232, background: c.surface,
        borderRight: `1px solid ${c.border}`,
        padding: '24px 16px',
      }}
    >
      <div className="mb-10 px-2 flex items-center gap-2">
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `linear-gradient(135deg, ${c.accent}, ${c.accentDim})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 24px ${c.accentSoft}`
        }}>
          <Mail size={15} color="#1a1208" strokeWidth={2.5}/>
        </div>
        <span style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, letterSpacing: '-0.02em' }}>
          HireFlow
        </span>
      </div>

      <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 9.5, letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 8, textTransform: 'uppercase' }}>
        Workspace
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(it => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all"
              style={{
                background: active ? c.surfaceHi : 'transparent',
                color: active ? c.text : c.textDim,
                border: `1px solid ${active ? c.border : 'transparent'}`,
                fontFamily: fBody, fontWeight: active ? 500 : 400,
                textAlign: 'left',
              }}
            >
              <it.icon size={15} strokeWidth={active ? 2 : 1.5}/>
              {it.label}
              {active && <ChevronRight size={13} className="ml-auto" style={{ color: c.accent }}/>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div style={{
          padding: 12, borderRadius: 8,
          background: c.surfaceHi, border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 99,
            background: `linear-gradient(135deg, ${c.accent}, #c45a4a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a1208', fontFamily: fDisplay, fontSize: 16
          }}>J</div>
          <div className="flex-1 min-w-0">
            <div style={{ color: c.text, fontSize: 13, fontFamily: fBody }}>Jaskirat S.</div>
            <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono }}>Free · 14 left</div>
          </div>
          <Settings size={14} style={{ color: c.textMuted }}/>
        </div>
      </div>
    </aside>
  );
};

// ─── TOP BAR ────────────────────────────────────────────────────────
const TopBar = ({ title, eyebrow, actions }) => (
  <div
    className="flex items-end justify-between px-10 py-6"
    style={{ borderBottom: `1px solid ${c.border}` }}
  >
    <div>
      {eyebrow && (
        <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{ fontFamily: fDisplay, fontSize: 38, color: c.text, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>
        {title}
      </h1>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

// ─── DASHBOARD ──────────────────────────────────────────────────────
const Dashboard = ({ setView }) => (
  <div className="p-10 space-y-8" style={{ overflowY: 'auto' }}>
    <div className="grid grid-cols-4 gap-4">
      <Stat label="Leads in queue"  value="286"   delta={12} />
      <Stat label="Sent this week"  value="256"   delta={8}  />
      <Stat label="Open rate"       value="51"    suffix="%" delta={4} accent />
      <Stat label="Reply rate"      value="9.4"   suffix="%" delta={-1.2} />
    </div>

    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 rounded-lg p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="flex items-end justify-between mb-5">
          <div>
            <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Last 7 days
            </div>
            <div style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, fontWeight: 400 }}>
              Sending volume & engagement
            </div>
          </div>
          <Pill kind="success">live</Pill>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={sendsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.accent} stopOpacity={0.35}/>
                  <stop offset="100%" stopColor={c.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.border} strokeDasharray="2 4" vertical={false}/>
              <XAxis dataKey="d" stroke={c.textMuted} fontSize={11} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
              <YAxis stroke={c.textMuted} fontSize={11} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
              <Tooltip
                contentStyle={{ background: c.surfaceHi, border: `1px solid ${c.borderHi}`, borderRadius: 8, fontFamily: fMono, fontSize: 11 }}
                labelStyle={{ color: c.text }}
                cursor={{ stroke: c.borderHi }}
              />
              <Area type="monotone" dataKey="sent"    stroke={c.accent}  fill="url(#gSent)" strokeWidth={2}/>
              <Line type="monotone" dataKey="opens"   stroke={c.info}    strokeWidth={1.5} dot={false}/>
              <Line type="monotone" dataKey="replies" stroke={c.success} strokeWidth={1.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-5 mt-3 px-2" style={{ fontFamily: fMono, fontSize: 11, color: c.textDim }}>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 2, background: c.accent }}/>sent</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 2, background: c.info }}/>opens</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 2, background: c.success }}/>replies</span>
        </div>
      </div>

      <div className="rounded-lg p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Activity
        </div>
        <div style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, marginBottom: 18, fontWeight: 400 }}>
          Recent replies
        </div>
        <div className="space-y-4">
          {[
            { name: 'Anjali N.',  co: 'Cinder',    msg: 'Hi Jaskirat — would love to chat...', t: '2h' },
            { name: 'Dev P.',     co: 'Folio',     msg: 'Could you share your portfolio?',     t: '5h' },
            { name: 'Rohan M.',   co: 'Sable',     msg: 'Interesting timing — call tmrw?',     t: '1d' },
            { name: 'Kavya I.',   co: 'Lumen',     msg: 'Out of office until Monday.',         t: '2d' },
          ].map((r, i) => (
            <div key={i} className="flex gap-3">
              <div style={{
                width: 28, height: 28, borderRadius: 99,
                background: c.surfaceHi, border: `1px solid ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.accent, fontSize: 11, fontFamily: fMono, flexShrink: 0
              }}>{r.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: c.text, fontSize: 13, fontFamily: fBody }}>{r.name}</span>
                  <span style={{ color: c.textMuted, fontSize: 10, fontFamily: fMono }}>{r.t}</span>
                </div>
                <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono, marginBottom: 2 }}>{r.co}</div>
                <div style={{ color: c.textDim, fontSize: 12.5, fontFamily: fBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.msg}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-lg" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${c.border}` }}>
        <div>
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            Active campaigns
          </div>
          <div style={{ fontFamily: fDisplay, fontSize: 20, color: c.text, fontWeight: 400 }}>3 running</div>
        </div>
        <Btn variant="ghost" icon={Plus} onClick={() => setView('upload')}>New campaign</Btn>
      </div>
      <div>
        {campaigns.map((cmp, i) => {
          const pct = Math.round((cmp.sent / cmp.leads) * 100);
          return (
            <div key={i} className="px-6 py-4 flex items-center gap-6" style={{ borderBottom: i < campaigns.length - 1 ? `1px solid ${c.border}` : 'none' }}>
              <div style={{ flex: '0 0 280px' }}>
                <div style={{ color: c.text, fontSize: 14, fontFamily: fBody, fontWeight: 500, marginBottom: 2 }}>{cmp.name}</div>
                <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono }}>{cmp.leads} leads · {cmp.replies} replies</div>
              </div>
              <div className="flex-1">
                <div style={{ height: 4, background: c.bg, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c.accent, borderRadius: 99, transition: 'width .6s ease' }}/>
                </div>
                <div className="flex justify-between mt-1.5" style={{ fontFamily: fMono, fontSize: 10.5, color: c.textMuted }}>
                  <span>{cmp.sent}/{cmp.leads} sent</span>
                  <span>{pct}%</span>
                </div>
              </div>
              <Pill kind={cmp.status === 'running' ? 'success' : 'paused'}>{cmp.status}</Pill>
              <button style={{ color: c.textMuted, padding: 6 }}>
                {cmp.status === 'running' ? <Pause size={14}/> : <Play size={14}/>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ─── UPLOAD ─────────────────────────────────────────────────────────
const UploadView = ({ setView }) => {
  const [stage, setStage] = useState('drop'); // drop -> parsing -> review
  const [progress, setProgress] = useState(0);

  const handleDrop = () => {
    setStage('parsing');
    setProgress(0);
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(id); setStage('review'); return 100; }
        return p + 8;
      });
    }, 80);
  };

  return (
    <div className="p-10" style={{ overflowY: 'auto' }}>
      {stage === 'drop' && (
        <div className="max-w-3xl">
          <div
            onClick={handleDrop}
            className="rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all"
            style={{
              padding: '80px 40px',
              background: c.surface,
              border: `1.5px dashed ${c.borderHi}`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = c.accent}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = c.borderHi}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: c.surfaceHi, border: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20
            }}>
              <Upload size={26} style={{ color: c.accent }}/>
            </div>
            <h2 style={{ fontFamily: fDisplay, fontSize: 30, color: c.text, marginBottom: 8, fontWeight: 400 }}>
              Drop your leads, gently
            </h2>
            <p style={{ color: c.textDim, fontFamily: fBody, fontSize: 14, maxWidth: 380, marginBottom: 24 }}>
              CSV with HR contacts — name, company, role, email, LinkedIn. We'll deduplicate and verify.
            </p>
            <Btn variant="primary" icon={Upload}>Choose sample CSV</Btn>
            <div className="mt-6 flex gap-6" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10.5 }}>
              <span>· max 10MB</span>
              <span>· .csv / .xlsx</span>
              <span>· up to 5,000 rows</span>
            </div>
          </div>

          <div className="mt-10">
            <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Expected columns
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['name', 'company', 'role', 'email', 'linkedin'].map(col => (
                <div key={col} className="rounded-md px-3 py-2" style={{
                  background: c.surface, border: `1px solid ${c.border}`,
                  color: c.textDim, fontFamily: fMono, fontSize: 12
                }}>{col}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === 'parsing' && (
        <div className="max-w-md mx-auto text-center pt-20">
          <div className="inline-flex" style={{
            width: 72, height: 72, borderRadius: 99,
            background: c.surface, border: `1px solid ${c.border}`,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24
          }}>
            <RotateCw size={26} style={{ color: c.accent, animation: 'spin 1s linear infinite' }}/>
          </div>
          <h2 style={{ fontFamily: fDisplay, fontSize: 28, color: c.text, marginBottom: 8, fontWeight: 400 }}>
            Reading {Math.round(progress * 1.42)} rows
          </h2>
          <p style={{ color: c.textDim, fontFamily: fBody, fontSize: 13.5, marginBottom: 24 }}>
            Validating emails, removing duplicates, enriching from LinkedIn.
          </p>
          <div style={{ height: 3, background: c.surface, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: c.accent, transition: 'width .12s linear' }}/>
          </div>
          <div className="mt-3" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 11 }}>
            {progress}% complete
          </div>
        </div>
      )}

      {stage === 'review' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Check size={14} style={{ color: c.success }}/>
                <span style={{ color: c.success, fontFamily: fMono, fontSize: 11, letterSpacing: '0.05em' }}>142 ROWS PARSED · 8 DUPLICATES REMOVED · 3 INVALID</span>
              </div>
              <h2 style={{ fontFamily: fDisplay, fontSize: 30, color: c.text, fontWeight: 400 }}>
                Review and refine
              </h2>
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" icon={Filter}>Filter</Btn>
              <Btn variant="primary" icon={Sparkles} onClick={() => setView('generator')}>
                Compose with AI
              </Btn>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <div className="grid px-5 py-3" style={{
              gridTemplateColumns: '1.4fr 1.2fr 1.3fr 1.6fr 0.7fr',
              borderBottom: `1px solid ${c.border}`,
              fontFamily: fMono, fontSize: 10, color: c.textMuted,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              <span>Contact</span>
              <span>Company</span>
              <span>Role</span>
              <span>Email</span>
              <span>Status</span>
            </div>
            {seedLeads.map((l, i) => (
              <div key={i} className="grid px-5 py-3 items-center" style={{
                gridTemplateColumns: '1.4fr 1.2fr 1.3fr 1.6fr 0.7fr',
                borderBottom: i < seedLeads.length - 1 ? `1px solid ${c.border}` : 'none',
                fontFamily: fBody, fontSize: 13.5,
              }}>
                <div className="flex items-center gap-2.5">
                  <div style={{
                    width: 26, height: 26, borderRadius: 99,
                    background: c.surfaceHi, border: `1px solid ${c.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.accent, fontSize: 11, fontFamily: fMono
                  }}>{l.name[0]}</div>
                  <span style={{ color: c.text }}>{l.name}</span>
                </div>
                <span style={{ color: c.textDim }}>{l.company}</span>
                <span style={{ color: c.textDim, fontSize: 12.5 }}>{l.role}</span>
                <span style={{ color: c.textDim, fontFamily: fMono, fontSize: 12 }}>{l.email}</span>
                <Pill kind="neutral">Queued</Pill>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── GENERATOR ──────────────────────────────────────────────────────
const Generator = ({ setView }) => {
  const [tone, setTone] = useState('Direct');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  const generate = () => {
    setLoading(true); setGenerated(false);
    setTimeout(() => { setLoading(false); setGenerated(true); }, 1100);
  };

  return (
    <div className="p-10 grid gap-8" style={{ gridTemplateColumns: '340px 1fr', overflowY: 'auto' }}>
      {/* control panel */}
      <div className="space-y-6">
        <div className="rounded-lg p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Sending to
          </div>
          <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: `1px solid ${c.border}` }}>
            <div style={{
              width: 36, height: 36, borderRadius: 99,
              background: `linear-gradient(135deg, ${c.accent}, ${c.accentDim})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1a1208', fontFamily: fDisplay, fontSize: 18,
            }}>P</div>
            <div>
              <div style={{ color: c.text, fontFamily: fBody, fontSize: 14, fontWeight: 500 }}>Priya Sharma</div>
              <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 11 }}>Sr. HR Manager · Productimate</div>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Your role" value="Frontend Engineer"/>
            <Field label="Portfolio" value="jaskiratsingh.dev" mono/>

            <div>
              <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Tone
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Direct', 'Conversational', 'Bold'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className="py-1.5 rounded-md text-xs transition-all"
                    style={{
                      background: tone === t ? c.accentSoft : c.surfaceHi,
                      color: tone === t ? c.accent : c.textDim,
                      border: `1px solid ${tone === t ? c.accent : c.border}`,
                      fontFamily: fBody, fontWeight: 500,
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Extra context
              </div>
              <textarea
                defaultValue="Mention I'm based in Ranchi and open to remote. Reference their recent Series A."
                rows={3}
                style={{
                  width: '100%', background: c.surfaceHi,
                  border: `1px solid ${c.border}`, borderRadius: 6,
                  padding: '10px 12px', color: c.text,
                  fontFamily: fBody, fontSize: 13, resize: 'none', outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="mt-5 w-full py-2.5 rounded-md inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: loading ? c.surfaceHi : c.accent,
              color: loading ? c.textMuted : '#1a1208',
              border: `1px solid ${loading ? c.border : c.accent}`,
              fontFamily: fBody, fontWeight: 500, fontSize: 13.5,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? <><RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }}/>Generating 3 drafts…</> : <><Sparkles size={14}/>Generate variations</>}
          </button>
        </div>

        <div className="rounded-lg p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} style={{ color: c.accent }}/>
            <span style={{ color: c.textDim, fontFamily: fMono, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Deliverability tips
            </span>
          </div>
          <ul className="space-y-2" style={{ color: c.textDim, fontFamily: fBody, fontSize: 12.5, lineHeight: 1.5 }}>
            <li className="flex gap-2"><CornerDownRight size={12} style={{ color: c.accentDim, marginTop: 3, flexShrink: 0 }}/>Keep under 120 words</li>
            <li className="flex gap-2"><CornerDownRight size={12} style={{ color: c.accentDim, marginTop: 3, flexShrink: 0 }}/>Single, specific CTA</li>
            <li className="flex gap-2"><CornerDownRight size={12} style={{ color: c.accentDim, marginTop: 3, flexShrink: 0 }}/>No attachments in first touch</li>
          </ul>
        </div>
      </div>

      {/* output panel */}
      <div>
        {!generated && !loading && (
          <div className="rounded-xl h-full flex flex-col items-center justify-center text-center"
               style={{ background: c.surface, border: `1.5px dashed ${c.border}`, minHeight: 500 }}>
            <Sparkles size={40} style={{ color: c.accentDim, marginBottom: 18 }}/>
            <h3 style={{ fontFamily: fDisplay, fontSize: 28, color: c.text, marginBottom: 8, fontWeight: 400 }}>
              Three drafts, one click
            </h3>
            <p style={{ color: c.textDim, fontFamily: fBody, fontSize: 13.5, maxWidth: 360 }}>
              The composer writes three variations in different tones. You pick, edit, and queue the winner.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-lg p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                <div className="space-y-3">
                  <Shimmer w="40%" h={14}/>
                  <Shimmer w="80%" h={11}/>
                  <Shimmer w="95%" h={11}/>
                  <Shimmer w="60%" h={11}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {generated && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Step 2 of 3
                </div>
                <h3 style={{ fontFamily: fDisplay, fontSize: 26, color: c.text, fontWeight: 400 }}>
                  Pick a draft
                </h3>
              </div>
              <Btn variant="primary" icon={Send} onClick={() => setView('analytics')}>
                Queue all 142 leads
              </Btn>
            </div>

            {variations.map((v, i) => {
              const active = selected === i;
              return (
                <div
                  key={i}
                  onClick={() => setSelected(i)}
                  className="rounded-lg p-6 cursor-pointer transition-all"
                  style={{
                    background: c.surface,
                    border: `1px solid ${active ? c.accent : c.border}`,
                    boxShadow: active ? `0 0 0 3px ${c.accentSoft}` : 'none',
                    transform: active ? 'translateY(-1px)' : 'none',
                    animation: `slideIn 0.4s ${i * 0.08}s both`
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Pill kind={active ? 'accent' : 'neutral'}>{v.tone}</Pill>
                      <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 11 }}>
                        {v.confidence}% deliverability score
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded" style={{ color: c.textMuted }}><Edit3 size={13}/></button>
                      <button className="p-1.5 rounded" style={{ color: c.textMuted }}><MoreHorizontal size={13}/></button>
                    </div>
                  </div>
                  <div style={{ fontFamily: fDisplay, fontSize: 20, color: c.text, marginBottom: 12, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                    {v.subject}
                  </div>
                  <pre style={{
                    fontFamily: fBody, fontSize: 13.5,
                    color: c.textDim, lineHeight: 1.65,
                    whiteSpace: 'pre-wrap', margin: 0
                  }}>{v.body}</pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, mono }) => (
  <div>
    <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
      {label}
    </div>
    <input
      defaultValue={value}
      style={{
        width: '100%', background: c.surfaceHi,
        border: `1px solid ${c.border}`, borderRadius: 6,
        padding: '8px 12px', color: c.text,
        fontFamily: mono ? fMono : fBody, fontSize: 13, outline: 'none'
      }}
    />
  </div>
);

const Shimmer = ({ w, h }) => (
  <div style={{
    width: w, height: h,
    background: `linear-gradient(90deg, ${c.surfaceHi} 0%, ${c.border} 50%, ${c.surfaceHi} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.2s ease-in-out infinite',
    borderRadius: 4
  }}/>
);

// ─── ANALYTICS ──────────────────────────────────────────────────────
const Analytics = () => (
  <div className="p-10 space-y-6" style={{ overflowY: 'auto' }}>
    <div className="grid grid-cols-5 gap-4">
      <Stat label="Sent"        value="256" delta={8}/>
      <Stat label="Delivered"   value="251" delta={9}/>
      <Stat label="Opened"      value="131" suffix="· 51%" delta={4}  accent/>
      <Stat label="Clicked"     value="42"  suffix="· 16%" delta={-2}/>
      <Stat label="Replied"     value="24"  suffix="· 9.4%" delta={3}/>
    </div>

    <div className="grid grid-cols-2 gap-5">
      <div className="rounded-lg p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="mb-5">
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            By template
          </div>
          <div style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, fontWeight: 400 }}>
            Which voice gets a reply
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={templatePerf} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke={c.border} strokeDasharray="2 4" vertical={false}/>
              <XAxis dataKey="t" stroke={c.textMuted} fontSize={10.5} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
              <YAxis stroke={c.textMuted} fontSize={10.5} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
              <Tooltip contentStyle={{ background: c.surfaceHi, border: `1px solid ${c.borderHi}`, borderRadius: 8, fontFamily: fMono, fontSize: 11 }} cursor={{ fill: c.surfaceHi }}/>
              <Bar dataKey="open"  fill={c.accent}  radius={[3, 3, 0, 0]}/>
              <Bar dataKey="reply" fill={c.success} radius={[3, 3, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg p-6 flex flex-col" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="mb-5">
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Pipeline
          </div>
          <div style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, fontWeight: 400 }}>
            Funnel this week
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {[
            { l: 'Sent',      v: 256, pct: 100,  col: c.accent },
            { l: 'Delivered', v: 251, pct: 98,   col: c.accent },
            { l: 'Opened',    v: 131, pct: 51,   col: c.info   },
            { l: 'Clicked',   v: 42,  pct: 16,   col: c.info   },
            { l: 'Replied',   v: 24,  pct: 9.4,  col: c.success},
            { l: 'Booked',    v: 6,   pct: 2.3,  col: c.success},
          ].map((row, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5" style={{ fontFamily: fBody, fontSize: 12 }}>
                <span style={{ color: c.text }}>{row.l}</span>
                <span style={{ color: c.textMuted, fontFamily: fMono }}>{row.v} <span style={{ color: c.textMuted }}>· {row.pct}%</span></span>
              </div>
              <div style={{ height: 6, background: c.bg, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${row.pct}%`, height: '100%',
                  background: row.col, borderRadius: 99,
                  animation: `growBar 0.8s ${i * 0.1}s both`
                }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-lg p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Engagement
          </div>
          <div style={{ fontFamily: fDisplay, fontSize: 22, color: c.text, fontWeight: 400 }}>
            Daily activity
          </div>
        </div>
        <div className="flex gap-5" style={{ fontFamily: fMono, fontSize: 11, color: c.textDim }}>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, background: c.accent, borderRadius: 2 }}/>Sent</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, background: c.info, borderRadius: 2 }}/>Opens</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, background: c.success, borderRadius: 2 }}/>Replies</span>
        </div>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={sendsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={c.border} strokeDasharray="2 4" vertical={false}/>
            <XAxis dataKey="d" stroke={c.textMuted} fontSize={11} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
            <YAxis stroke={c.textMuted} fontSize={11} tickLine={false} axisLine={false} style={{ fontFamily: fMono }}/>
            <Tooltip contentStyle={{ background: c.surfaceHi, border: `1px solid ${c.borderHi}`, borderRadius: 8, fontFamily: fMono, fontSize: 11 }} cursor={{ stroke: c.borderHi }}/>
            <Line type="monotone" dataKey="sent"    stroke={c.accent}  strokeWidth={2} dot={{ fill: c.accent, r: 3 }}/>
            <Line type="monotone" dataKey="opens"   stroke={c.info}    strokeWidth={2} dot={{ fill: c.info, r: 3 }}/>
            <Line type="monotone" dataKey="replies" stroke={c.success} strokeWidth={2} dot={{ fill: c.success, r: 3 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

// ─── APP ────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('dashboard');

  const headers = {
    dashboard: { eyebrow: 'Workspace · Monday', title: 'Good morning, Jaskirat',
                 actions: <><Btn variant="ghost" icon={Search}>Search</Btn><Btn variant="primary" icon={Plus} onClick={() => setView('upload')}>New campaign</Btn></> },
    upload:    { eyebrow: 'Step 1 of 3', title: 'Bring in your leads',
                 actions: <Btn variant="ghost" icon={X} onClick={() => setView('dashboard')}>Cancel</Btn> },
    generator: { eyebrow: 'Step 2 of 3', title: 'Compose with intention',
                 actions: <Btn variant="ghost" icon={X} onClick={() => setView('dashboard')}>Cancel</Btn> },
    analytics: { eyebrow: 'All campaigns', title: `What's working`,
                 actions: <><Btn variant="ghost" icon={Download}>Export</Btn><Btn variant="primary" icon={Sparkles} onClick={() => setView('upload')}>New campaign</Btn></> },
  };

  const h = headers[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes growBar { from { width: 0; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: ${c.borderHi}; }
      `}</style>

      <div className="flex" style={{
        background: c.bg, color: c.text, height: '100vh',
        fontFamily: fBody, overflow: 'hidden',
        backgroundImage: `radial-gradient(circle at 0% 0%, rgba(232, 168, 56, 0.04), transparent 40%)`,
      }}>
        <Sidebar view={view} setView={setView}/>
        <main className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
          <TopBar eyebrow={h.eyebrow} title={h.title} actions={h.actions}/>
          <div className="flex-1" style={{ overflow: 'hidden' }}>
            {view === 'dashboard' && <Dashboard setView={setView}/>}
            {view === 'upload'    && <UploadView setView={setView}/>}
            {view === 'generator' && <Generator setView={setView}/>}
            {view === 'analytics' && <Analytics/>}
          </div>
        </main>
      </div>
    </>
  );
}
