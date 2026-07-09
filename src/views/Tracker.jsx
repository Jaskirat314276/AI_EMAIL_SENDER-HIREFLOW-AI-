import { useEffect, useMemo, useState } from 'react';
import { RotateCw, AlertCircle, Check, Search, KanbanSquare, Users, MessageSquare, Activity, Award } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono, fDisplay, grad } from '../design.js';
import Btn from '../components/Btn.jsx';
import Pill from '../components/Pill.jsx';
import Card from '../components/Card.jsx';
import StatTile from '../components/StatTile.jsx';

const RESULTS = ['open', 'offer', 'accepted', 'rejected', 'ghosted', 'withdrawn'];
const STAGES = [
  { key: 'replied', label: 'Replied' },
  { key: 'oa',      label: 'OA' },
  { key: 'r1',      label: 'R1' },
  { key: 'r2',      label: 'R2' },
  { key: 'r3',      label: 'R3' },
];

const inputStyle = {
  background: c.bg, border: `1px solid ${c.border}`, color: c.text,
  padding: '7px 10px', borderRadius: 7, fontFamily: fBody, fontSize: 13, outline: 'none',
};
const selectStyle = {
  background: c.bg, border: `1px solid ${c.border}`,
  padding: '7px 10px', borderRadius: 7, fontFamily: fMono, fontSize: 12, outline: 'none',
  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
};

function resultKind(result) {
  if (result === 'offer' || result === 'accepted') return 'success';
  if (result === 'rejected' || result === 'ghosted' || result === 'withdrawn') return 'danger';
  return 'neutral';
}
const kindColor = { success: c.success, danger: c.danger, neutral: c.textDim };

function nowLocal() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export default function Tracker() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [q, setQ] = useState('');
  const [fResult, setFResult] = useState('all');
  const [onlyReplied, setOnlyReplied] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.tracker.list());
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Optimistic write: paint `optimistic` immediately, reconcile with the server row,
  // and on failure revert only the affected row (keeps other concurrent edits intact).
  async function patch(recipient_id, delta, optimistic) {
    const snapshot = rows;
    setRows((prev) => prev.map((r) => (r.recipient_id === recipient_id ? { ...r, ...(optimistic || delta) } : r)));
    try {
      const row = await api.tracker.update(recipient_id, delta);
      if (row) setRows((prev) => prev.map((r) => (r.recipient_id === recipient_id ? { ...r, ...row } : r)));
    } catch (err) {
      const orig = snapshot.find((r) => r.recipient_id === recipient_id);
      if (orig) setRows((prev) => prev.map((r) => (r.recipient_id === recipient_id ? orig : r)));
      setMessage({ type: 'error', text: err.message });
    }
  }

  function toggleStage(r, stage) {
    const on = r[stage] ? 0 : 1;
    const optimistic = { [stage]: on, [`${stage}_at`]: on ? nowLocal() : null };
    if (stage === 'replied' && !on) optimistic.replied_from = '';
    patch(r.recipient_id, { [stage]: on }, optimistic);
  }

  const setResult = (r, result) => patch(r.recipient_id, { result }, { result });

  // Text fields (replied_from, notes): edit locally, PATCH on blur.
  function onLocalField(recipient_id, key, value) {
    setRows((prev) => prev.map((r) => (r.recipient_id === recipient_id ? { ...r, [key]: value } : r)));
  }
  function saveField(recipient_id, key, value) {
    patch(recipient_id, { [key]: value }, { [key]: value });
  }

  const kpis = useMemo(() => ({
    total: rows.length,
    replied: rows.filter((r) => r.replied).length,
    interviewing: rows.filter((r) => r.oa || r.r1 || r.r2 || r.r3).length,
    offers: rows.filter((r) => r.result === 'offer' || r.result === 'accepted').length,
  }), [rows]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((r) =>
      (fResult === 'all' || r.result === fResult)
      && (!onlyReplied || r.replied)
      && (!needle || `${r.name || ''} ${r.email || ''} ${r.company || ''} ${r.role || ''} ${r.apply_role || ''}`.toLowerCase().includes(needle)));
    const by = {};
    for (const r of filtered) (by[r.company || '—'] ||= []).push(r);
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, q, fResult, onlyReplied]);

  return (
    <div className="px-10 py-8 overflow-y-auto" style={{ fontFamily: fBody, color: c.text, height: '100%' }}>
      <div className="flex gap-3 mb-5 flex-wrap hf-rise">
        <StatTile label="Contacts" value={kpis.total} icon={Users} />
        <StatTile label="Replied" value={kpis.replied} icon={MessageSquare} />
        <StatTile label="Interviewing" value={kpis.interviewing} icon={Activity} />
        <StatTile label="Offers" value={kpis.offers} accent icon={Award} />
      </div>

      {message && (
        <div
          className="mb-4 px-4 py-3 rounded-lg flex items-start gap-2"
          style={{
            background: message.type === 'error' ? c.dangerSoft : c.successSoft,
            color: message.type === 'error' ? c.danger : c.success,
            fontFamily: fMono, fontSize: 12,
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 1 }} />
          <span>{message.text}</span>
        </div>
      )}

      <Card className="hf-rise" style={{ animationDelay: '.05s' }}>
        <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ flex: 1, minWidth: 200, maxWidth: 340, background: c.bg, border: `1px solid ${c.border}` }}>
            <Search size={14} style={{ color: c.textMuted }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, company, role…"
              style={{ flex: 1, background: 'transparent', border: 'none', color: c.text, fontFamily: fBody, fontSize: 13, outline: 'none' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={fResult} onChange={(e) => setFResult(e.target.value)} style={selectStyle}>
              <option value="all">all results</option>
              {RESULTS.map((x) => <option key={x} value={x} style={{ color: c.text, background: c.surface }}>{x}</option>)}
            </select>
            <Btn variant={onlyReplied ? 'primary' : 'ghost'} size="sm" onClick={() => setOnlyReplied((v) => !v)}>Replied only</Btn>
            <Btn variant="ghost" size="sm" icon={RotateCw} onClick={load}>Refresh</Btn>
          </div>
        </div>

        {loading && <div className="px-6 py-14 text-center" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 12 }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="hf-float" style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, background: grad.panel, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KanbanSquare size={24} style={{ color: c.accent }} />
            </div>
            <p style={{ fontFamily: fDisplay, fontSize: 24, color: c.text }}>No sent emails yet</p>
            <p style={{ fontSize: 13, marginTop: 6, color: c.textMuted }}>Once you send to a contact, they show up here to track replies, OAs, and interviews.</p>
          </div>
        )}

        {!loading && rows.length > 0 && groups.length === 0 && (
          <div className="px-6 py-12 text-center" style={{ color: c.textMuted, fontSize: 13 }}>No contacts match your filters.</div>
        )}

        {!loading && groups.map(([company, group]) => (
          <div key={company}>
            <div className="px-5 py-2.5 flex items-center gap-3" style={{ background: grad.panel, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
              <span style={{ fontFamily: fMono, fontSize: 11, color: c.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{company}</span>
              <span style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted }}>
                {group.length} · {group.filter((r) => r.replied).length} replied
              </span>
            </div>

            {group.map((r) => (
              <div key={r.recipient_id} className="hf-row px-5 py-3" style={{ borderTop: `1px solid ${c.border}` }}>
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3 flex items-center gap-2.5" style={{ minWidth: 0 }}>
                    <Avatar name={r.name} email={r.email} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: c.text, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</div>
                      <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {r.contact_type && <Pill>{r.contact_type}</Pill>}
                        {r.apply_role && <span style={{ fontSize: 11, color: c.textDim }}>{r.apply_role}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-6 flex items-center justify-center gap-1.5 flex-wrap">
                    {STAGES.map((st) => (
                      <StageCheck
                        key={st.key}
                        on={!!r[st.key]}
                        label={st.label}
                        at={r[`${st.key}_at`]}
                        onClick={() => toggleStage(r, st.key)}
                      />
                    ))}
                  </div>

                  <div className="col-span-3 flex justify-end">
                    <select
                      value={r.result || 'open'}
                      onChange={(e) => setResult(r, e.target.value)}
                      style={{ ...selectStyle, color: kindColor[resultKind(r.result)], borderColor: resultKind(r.result) === 'neutral' ? c.border : kindColor[resultKind(r.result)] }}
                    >
                      {RESULTS.map((x) => <option key={x} value={x} style={{ color: c.text, background: c.surface }}>{x}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                  {r.replied ? (
                    <input
                      value={r.replied_from || ''}
                      placeholder="replied from (email / linkedin / phone…)"
                      onChange={(e) => onLocalField(r.recipient_id, 'replied_from', e.target.value)}
                      onBlur={(e) => saveField(r.recipient_id, 'replied_from', e.target.value)}
                      style={{ ...inputStyle, width: 280 }}
                    />
                  ) : null}
                  <input
                    value={r.notes || ''}
                    placeholder="Notes…"
                    onChange={(e) => onLocalField(r.recipient_id, 'notes', e.target.value)}
                    onBlur={(e) => saveField(r.recipient_id, 'notes', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

function initialOf(name, email) {
  const src = (name || email || '?').replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '').trim();
  return (src[0] || '?').toUpperCase();
}

function Avatar({ name, email }) {
  return (
    <div style={{
      width: 30, height: 30, flexShrink: 0, borderRadius: 9,
      background: grad.panel, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: fDisplay, fontSize: 15, color: c.accent,
    }}>
      {initialOf(name, email)}
    </div>
  );
}

function StageCheck({ on, label, at, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
      style={{ minWidth: 46 }}
      title={at ? `${label} · ${at}` : `Toggle ${label}`}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: 7,
          border: `1px solid ${on ? c.accent : c.borderHi}`,
          background: on ? c.accent : 'transparent',
          color: '#1a1208', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: on ? `0 0 10px ${c.accentSoft}` : 'none',
          transition: 'all .15s ease',
        }}
      >
        {on && <Check size={14} strokeWidth={3} />}
      </span>
      <span style={{ fontFamily: fMono, fontSize: 9, letterSpacing: '0.04em', textTransform: 'uppercase', color: on ? c.accent : c.textMuted }}>{label}</span>
    </button>
  );
}
