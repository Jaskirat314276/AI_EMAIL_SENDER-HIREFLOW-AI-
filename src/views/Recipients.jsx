import { useEffect, useRef, useState } from 'react';
import { Upload, Sparkles, Send, Trash2, ChevronDown, ChevronRight, RotateCw, AlertCircle, Mail, Pencil, Save, Shuffle, Users, FileText, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono, fDisplay, grad } from '../design.js';
import Btn from '../components/Btn.jsx';
import Pill from '../components/Pill.jsx';
import Card from '../components/Card.jsx';
import StatTile from '../components/StatTile.jsx';
import { Field } from '../components/Field.jsx';
import QueuePanel from '../components/QueuePanel.jsx';
import Toasts from '../components/Toasts.jsx';

export default function Recipients() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState(null);
  const [editRec, setEditRec] = useState(null);      // { id, name, email, company, role, apply_role, contact_type, linkedin }
  const [editDraft, setEditDraft] = useState(null);  // { id, subject, body }
  const [review, setReview] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [queueOn, setQueueOn] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [randomN, setRandomN] = useState(5);
  const [toasts, setToasts] = useState([]);
  const seenRef = useRef(new Set());
  const primedRef = useRef(false);
  const fileRef = useRef(null);

  const draftRows = list.filter((r) => (r.send_status || r.status) === 'draft');

  useEffect(() => { load(); refreshStatus(); }, []);

  // Live send notifications: poll status, diff sent / failed / in-progress, pop a toast each.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const st = await api.send.queue.status();
        if (!alive) return;
        const seen = seenRef.current;
        const fresh = [];
        for (const r of st.recent || []) {
          const key = `${r.status}:${r.recipient_id}:${r.ts}`;
          if (!seen.has(key)) { seen.add(key); fresh.push({ kind: r.status === 'sent' ? 'sent' : 'failed', r }); }
        }
        const cs = st.currently_sending;
        if (cs && cs.recipient_id != null) {
          const key = `sending:${cs.recipient_id}`;
          if (!seen.has(key)) { seen.add(key); fresh.push({ kind: 'sending', r: cs }); }
        }
        if (!primedRef.current) { primedRef.current = true; return; } // don't replay history on first poll
        for (const { kind, r } of fresh) {
          const who = r.name || r.to_email;
          if (kind === 'sent') pushToast('sent', `Sent to ${who}`);
          else if (kind === 'failed') pushToast('failed', `Failed: ${who}${r.error ? ' — ' + r.error : ''}`);
          else pushToast('sending', `Sending to ${who}…`);
        }
      } catch { /* ignore poll errors */ }
    };
    poll();
    const id = setInterval(poll, 3500);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushToast(kind, text) {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500);
  }

  function toggleSelect(id) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAllDrafts() { setSelected(new Set(draftRows.map((r) => r.id))); }
  function clearSelect() { setSelected(new Set()); }
  function selectRandom(n) {
    const pool = draftRows.map((r) => r.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSelected(new Set(pool.slice(0, Math.max(0, Math.min(n, pool.length)))));
  }
  async function sendSelected() {
    const ids = [...selected].filter((id) => draftRows.some((r) => r.id === id));
    if (!ids.length) return setMessage({ type: 'warn', text: 'Select at least one draft to send.' });
    if (!confirm(`Queue ${ids.length} email${ids.length === 1 ? '' : 's'} to send in random order (still capped at your daily limit)?\n\nThese go to real recruiters from your Gmail.`)) return;
    setBusy(true); setMessage(null);
    try {
      const res = await api.send.queue.start({ recipient_ids: ids });
      setQueueOn(true); clearSelect();
      setMessage({ type: 'ok', text: `Queued ${res.queued} — sending in random order at your pace.` });
      await refreshStatus(); await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  async function refreshStatus() {
    try {
      const st = await api.send.queue.status();
      setQueueStatus(st);
      const q = st.counts?.queued || 0;
      const sending = st.counts?.sending || 0;
      setQueueOn(st.status !== 'idle' || q > 0 || sending > 0);
    } catch { /* queue endpoint unavailable — hide queue affordances */ }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await api.recipients.list();
      setList(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.upload(file);
      setMessage({ type: 'ok', text: `Added ${res.added}. ${res.duplicates_updated} updated, ${res.invalid_skipped} invalid.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function generateAll(regenerate = false) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.generate.all({ regenerate });
      const errors = (res.results || []).filter((r) => r.error).length;
      setMessage({
        type: errors ? 'warn' : 'ok',
        text: `Composed ${res.generated}/${res.total}${errors ? ` (${errors} failed)` : ''} from your template.`,
      });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(id) {
    if (!confirm('Remove this recipient?')) return;
    await api.recipients.remove(id);
    load();
  }

  async function sendOne(r) {
    if (!confirm(`Send the AI-drafted email to ${r.name || r.email} <${r.email}>?\n\nThis will deliver a real email from your Gmail.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.send.one(r.id);
      setMessage({ type: 'ok', text: `Sent to ${res.sent_to} (msg ${res.gmail_msg_id})` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  function startEdit(r) {
    setEditRec({
      id: r.id, name: r.name || '', email: r.email || '', company: r.company || '',
      role: r.role || '', apply_role: r.apply_role || '', contact_type: r.contact_type || '', linkedin: r.linkedin || '',
    });
    setEditDraft({ id: r.id, subject: r.draft_subject || '', body: r.draft_body || '' });
    setExpanded((m) => ({ ...m, [r.id]: true }));
  }

  function cancelEdit() { setEditRec(null); setEditDraft(null); }

  async function saveRec() {
    const { id, ...patch } = editRec;
    setBusy(true);
    setMessage(null);
    try {
      await api.recipients.update(id, patch);
      setEditRec(null);
      setMessage({ type: 'ok', text: 'Contact details saved.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  async function saveDraft() {
    const { id, subject, body } = editDraft;
    if (!subject || !body) return setMessage({ type: 'warn', text: 'Subject and body are required.' });
    setBusy(true);
    setMessage(null);
    try {
      await api.generate.updateDraft(id, { subject, body });
      setEditDraft(null);
      setMessage({ type: 'ok', text: 'Draft saved.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  function openReview() {
    const draftCount = list.filter((r) => (r.send_status || r.status) === 'draft').length;
    if (draftCount === 0) return setMessage({ type: 'warn', text: 'No drafts to send.' });
    refreshStatus();
    setReview(true);
  }

  async function startQueue() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.send.queue.start({});
      setReview(false);
      setQueueOn(true);
      setMessage({ type: 'ok', text: `Queued ${res.queued ?? ''} email${res.queued === 1 ? '' : 's'}. They'll drip out at your configured pace.` });
      await refreshStatus();
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  async function sendTest() {
    if (!confirm('Send a test email to your own Gmail to verify sending works?')) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.send.test();
      setMessage({ type: 'ok', text: `Test sent to ${res.sent_to}. Check your inbox.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  async function clearAll() {
    if (!confirm('Remove ALL recipients? This also drops their drafts.')) return;
    await api.recipients.clear();
    load();
  }

  function toggleExpand(id) {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  }

  const sentCount = list.filter((r) => r.send_status === 'sent').length;
  const queuedCount = list.filter((r) => ['queued', 'sending'].includes(r.send_status)).length;

  return (
    <div className="px-10 py-8 overflow-y-auto" style={{ fontFamily: fBody, color: c.text, height: '100%' }}>
      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <div className="flex gap-3 mb-5 flex-wrap hf-rise">
        <StatTile label="Contacts" value={list.length} icon={Users} />
        <StatTile label="Drafts ready" value={draftRows.length} icon={FileText} />
        <StatTile label="Sent" value={sentCount} accent icon={CheckCircle2} hint={queueStatus ? `${queueStatus.sent_today ?? 0} today` : undefined} />
        <StatTile label="In queue" value={queuedCount} icon={Clock} />
      </div>

      <Card className="hf-rise" style={{ padding: '15px 18px', marginBottom: 16, animationDelay: '.04s' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p style={{ color: c.textDim, fontSize: 13, maxWidth: 470, lineHeight: 1.5 }}>
            Drop a CSV or XLSX — we extract <span style={{ color: c.text }}>company, contact, email &amp; role</span>, classify each person, and draft a personal email from your profile.
          </p>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} style={{ display: 'none' }} />
            <Btn variant="ghost" icon={Mail} onClick={sendTest} disabled={busy}>Test send</Btn>
            <Btn variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>Upload CSV / XLSX</Btn>
            <Btn variant="primary" icon={Sparkles} onClick={() => generateAll(false)} disabled={busy || list.length === 0}>Compose emails</Btn>
          </div>
        </div>
      </Card>

      {message && (
        <div
          className="mb-4 px-4 py-3 rounded-lg flex items-start gap-2"
          style={{
            background: message.type === 'error' ? c.dangerSoft : (message.type === 'warn' ? c.accentSoft : c.successSoft),
            color: message.type === 'error' ? c.danger : (message.type === 'warn' ? c.accent : c.success),
            border: `1px solid ${message.type === 'error' ? c.dangerSoft : (message.type === 'warn' ? c.accentSoft : c.successSoft)}`,
            fontFamily: fMono, fontSize: 12,
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 1 }}/>
          <span>{message.text}</span>
        </div>
      )}

      <Card className="hf-rise" style={{ animationDelay: '.08s' }}>
        <QueuePanel active={queueOn} onDone={() => { setQueueOn(false); refreshStatus(); load(); }} />
        <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${c.border}` }}>
          <span style={{ fontFamily: fMono, fontSize: 11, color: c.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {list.length} recipient{list.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" icon={RotateCw} onClick={load}>Refresh</Btn>
            {list.length > 0 && (
              <>
                <Btn variant="ghost" size="sm" icon={Sparkles} onClick={() => generateAll(true)} disabled={busy}>Recompose all</Btn>
                <Btn variant="primary" size="sm" icon={Send} onClick={openReview} disabled={busy}>Review &amp; send</Btn>
                <Btn variant="danger" size="sm" icon={Trash2} onClick={clearAll}>Clear all</Btn>
              </>
            )}
          </div>
        </div>

        {draftRows.length > 0 && (
          <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap" style={{ borderBottom: `1px solid ${c.border}`, background: c.bg }}>
            <label className="flex items-center gap-1.5" style={{ fontFamily: fMono, fontSize: 11, color: c.textDim, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.size > 0 && draftRows.every((r) => selected.has(r.id))}
                ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !draftRows.every((r) => selected.has(r.id)); }}
                onChange={(e) => (e.target.checked ? selectAllDrafts() : clearSelect())}
                style={{ accentColor: c.accent }}
              />
              {selected.size > 0 ? `${selected.size} selected` : `Select drafts (${draftRows.length})`}
            </label>
            <span style={{ color: c.textMuted }}>·</span>
            <span className="flex items-center gap-1.5" style={{ fontFamily: fMono, fontSize: 11, color: c.textMuted }}>
              random
              <input
                type="number" min="1" value={randomN}
                onChange={(e) => setRandomN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: 52, background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: '4px 6px', borderRadius: 5, fontFamily: fMono, fontSize: 12, outline: 'none' }}
              />
              <Btn variant="ghost" size="sm" icon={Shuffle} onClick={() => selectRandom(randomN)}>Pick</Btn>
            </span>
            {selected.size > 0 && (
              <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                <Btn variant="ghost" size="sm" onClick={clearSelect}>Clear</Btn>
                <Btn variant="primary" size="sm" icon={Send} onClick={sendSelected} disabled={busy}>Send {selected.size} selected</Btn>
              </div>
            )}
          </div>
        )}

        {review && (
          <ReviewBar
            draftCount={list.filter((r) => (r.send_status || r.status) === 'draft').length}
            status={queueStatus}
            busy={busy}
            onStart={startQueue}
            onCancel={() => setReview(false)}
          />
        )}

        {loading && <div className="px-6 py-14 text-center" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 12 }}>Loading…</div>}

        {!loading && list.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="hf-float" style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, background: grad.panel, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={24} style={{ color: c.accent }} />
            </div>
            <p style={{ fontFamily: fDisplay, fontSize: 24, color: c.text }}>No recipients yet</p>
            <p style={{ fontSize: 13, marginTop: 6, color: c.textMuted }}>Upload a CSV or XLSX of the recruiters you want to reach — we'll take it from there.</p>
            <div className="mt-5 flex justify-center">
              <Btn variant="primary" icon={Upload} onClick={() => fileRef.current?.click()}>Upload your list</Btn>
            </div>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div>
            {list.map((r) => {
              const status = r.send_status || r.status;
              const isDraft = status === 'draft';
              return (
                <div key={r.id} className="hf-row" style={{ borderTop: `1px solid ${c.border}` }}>
                  <div className="px-5 py-3 grid grid-cols-12 gap-3 items-center" style={{ fontSize: 13 }}>
                    <div className="flex items-center gap-2" style={{ justifySelf: 'start' }}>
                      {isDraft && (
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} title="Select for sending" style={{ accentColor: c.accent, cursor: 'pointer', width: 14, height: 14 }} />
                      )}
                      <button onClick={() => toggleExpand(r.id)} style={{ color: c.textMuted }}>
                        {expanded[r.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                      </button>
                    </div>
                    <div className="col-span-4 flex items-center gap-2.5" style={{ minWidth: 0 }}>
                      <Avatar name={r.name} email={r.email} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</div>
                        <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>
                      </div>
                    </div>
                    <div className="col-span-3" style={{ color: c.textDim, minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.company || '—'}</div>
                      {r.apply_role && <div style={{ color: c.textMuted, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>for {r.apply_role}</div>}
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                      <StatusPill status={status} />
                      {r.contact_type && <Pill>{r.contact_type}</Pill>}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Btn variant="ghost" size="sm" icon={Send} onClick={() => sendOne(r)} disabled={busy || !r.draft_subject || ['sent', 'queued', 'sending'].includes(r.send_status)}>{r.send_status === 'sent' ? 'Sent' : 'Send'}</Btn>
                      <button onClick={() => (editRec?.id === r.id ? cancelEdit() : startEdit(r))} title="Edit contact & draft" style={{ color: editRec?.id === r.id ? c.accent : c.textMuted, padding: 6 }}>
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => removeOne(r.id)} title="Remove" style={{ color: c.textMuted, padding: 6 }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>

                  {expanded[r.id] && (
                    <div className="px-12 pb-5" style={{ background: c.bg }}>
                      {editRec?.id === r.id ? (
                        <div className="pt-4">
                          <div style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Edit contact</div>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <Field label="Name" value={editRec.name} onChange={(v) => setEditRec((e) => ({ ...e, name: v }))} />
                            <Field label="Email" value={editRec.email} onChange={(v) => setEditRec((e) => ({ ...e, email: v }))} />
                            <Field label="Company" value={editRec.company} onChange={(v) => setEditRec((e) => ({ ...e, company: v }))} />
                            <Field label="Applying for (apply_role)" value={editRec.apply_role} onChange={(v) => setEditRec((e) => ({ ...e, apply_role: v }))} />
                            <Field label="Their title (role)" value={editRec.role} onChange={(v) => setEditRec((e) => ({ ...e, role: v }))} />
                            <label className="flex flex-col gap-1.5">
                              <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contact type</span>
                              <select
                                value={editRec.contact_type}
                                onChange={(e) => setEditRec((ed) => ({ ...ed, contact_type: e.target.value }))}
                                style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: '8px 10px', borderRadius: 6, fontFamily: fBody, fontSize: 14, outline: 'none' }}
                              >
                                <option value="">—</option>
                                {['hr', 'recruiter', 'exec', 'founder', 'other'].map((x) => <option key={x} value={x}>{x}</option>)}
                              </select>
                            </label>
                            <Field label="LinkedIn" value={editRec.linkedin} onChange={(v) => setEditRec((e) => ({ ...e, linkedin: v }))} full />
                          </div>
                          <div className="flex items-center gap-2 mb-6">
                            <Btn variant="primary" size="sm" icon={Save} onClick={saveRec} disabled={busy}>Save details</Btn>
                            <Btn variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Btn>
                          </div>

                          <div style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Edit draft</div>
                          <div className="mb-3">
                            <Field label="Subject" value={editDraft?.subject} onChange={(v) => setEditDraft((d) => ({ ...d, subject: v }))} full />
                          </div>
                          <label className="flex flex-col gap-1.5 mb-3">
                            <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Body</span>
                            <textarea
                              value={editDraft?.body || ''}
                              onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                              rows={12}
                              style={{
                                width: '100%', background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                                padding: '12px 14px', borderRadius: 8, fontFamily: fBody, fontSize: 14, lineHeight: 1.55, outline: 'none', resize: 'vertical',
                              }}
                              onFocus={(e) => e.target.style.borderColor = c.accent}
                              onBlur={(e) => e.target.style.borderColor = c.border}
                            />
                          </label>
                          <Btn variant="primary" size="sm" icon={Save} onClick={saveDraft} disabled={busy}>Save draft</Btn>
                        </div>
                      ) : r.draft_subject ? (
                        <div className="pt-3">
                          <div className="mb-3">
                            <span style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Subject</span>
                            <div style={{ marginTop: 4, color: c.text, fontSize: 14 }}>{r.draft_subject}</div>
                          </div>
                          <div>
                            <span style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Body</span>
                            <pre style={{
                              marginTop: 4, color: c.textDim, fontSize: 13, fontFamily: fBody,
                              whiteSpace: 'pre-wrap', background: c.surface, padding: 14, borderRadius: 8, border: `1px solid ${c.border}`,
                            }}>
{r.draft_body}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: c.textMuted, fontSize: 13, padding: '16px 0' }}>
                          No draft yet. Click <span style={{ color: c.accent }}>Compose emails</span> above, or use the pencil to write one by hand.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

function StatusPill({ status }) {
  if (status === 'sent') return <Pill kind="success">sent</Pill>;
  if (status === 'sending') return <Pill kind="accent">sending</Pill>;
  if (status === 'queued') return <Pill kind="accent">queued</Pill>;
  if (status === 'failed') return <Pill kind="danger">failed</Pill>;
  if (status === 'draft' || status === 'drafted') return <Pill kind="accent">drafted</Pill>;
  return <Pill>pending</Pill>;
}

function ReviewBar({ draftCount, status, busy, onStart, onCancel }) {
  const s = status?.settings || {};
  const minS = s.min_delay_ms != null ? Math.round(s.min_delay_ms / 1000) : null;
  const maxS = s.max_delay_ms != null ? Math.round(s.max_delay_ms / 1000) : null;
  const cap = status?.daily_cap ?? s.daily_cap ?? null;
  const sentToday = status?.sent_today;
  const capRemaining = status?.cap_remaining;
  const avgS = (minS != null && maxS != null) ? (minS + maxS) / 2 : null;
  const sendableNow = cap != null ? Math.min(draftCount, capRemaining ?? cap) : draftCount;
  const etaMin = avgS != null ? Math.round((sendableNow * avgS) / 60) : null;

  return (
    <div className="px-5 py-4" style={{ borderBottom: `1px solid ${c.border}`, background: grad.panel }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div style={{ fontFamily: fDisplay, fontSize: 21, color: c.text }}>
            {draftCount} draft{draftCount === 1 ? '' : 's'} ready to send
          </div>
          <div style={{ fontFamily: fMono, fontSize: 11, color: c.textDim, marginTop: 6 }}>
            {minS != null ? `pace ${minS}–${maxS}s between sends` : 'default pace'}
            {cap != null ? ` · cap ${cap}/day` : ''}
            {sentToday != null ? ` · ${sentToday}/${cap ?? '—'} sent today` : ''}
            {capRemaining != null ? ` · ${capRemaining} left in today's cap` : ''}
            {etaMin != null ? ` · ~${etaMin} min for this batch` : ''}
          </div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 8, maxWidth: 560 }}>
            Emails are queued and sent from your Gmail one at a time, in random order, at the pace above. Pause, resume, or cancel any time from the progress bar. Adjust the pace in Profile → Send pace.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" size="sm" icon={Send} onClick={onStart} disabled={busy}>Start send queue</Btn>
        </div>
      </div>
    </div>
  );
}
