import { useEffect, useRef, useState } from 'react';
import { Upload, Sparkles, Send, Trash2, ChevronDown, ChevronRight, RotateCw, AlertCircle, Mail } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono, fDisplay } from '../design.js';
import Btn from '../components/Btn.jsx';
import Pill from '../components/Pill.jsx';

export default function Recipients() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

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
      const errors = res.results.filter((r) => r.error).length;
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

  async function sendAll() {
    const draftCount = list.filter((r) => r.send_status === 'draft').length;
    if (draftCount === 0) return setMessage({ type: 'warn', text: 'No drafts to send.' });
    if (!confirm(`Send ${draftCount} real emails from your Gmail?\n\nThey will go out one at a time, ~8s apart.\nClick Cancel to abort.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.send.all();
      setMessage({
        type: res.failed ? 'warn' : 'ok',
        text: `Sent ${res.sent}/${res.total}${res.failed ? ` (${res.failed} failed)` : ''}.`,
      });
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

  return (
    <div className="px-10 py-8 overflow-y-auto" style={{ fontFamily: fBody, color: c.text, height: '100%' }}>
      <div className="flex items-end justify-between mb-6">
        <p style={{ color: c.textDim, maxWidth: 580 }}>
          Drop a CSV or XLSX with <span style={{ color: c.text }}>name, email, company, role</span>. The AI writes a personalized email per recipient using your profile.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.txt"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
            style={{ display: 'none' }}
          />
          <Btn variant="ghost" icon={Mail} onClick={sendTest} disabled={busy}>Test send</Btn>
          <Btn variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload CSV / XLSX
          </Btn>
          <Btn variant="primary" icon={Sparkles} onClick={() => generateAll(false)} disabled={busy || list.length === 0}>
            Compose emails
          </Btn>
        </div>
      </div>

      {message && (
        <div
          className="mb-4 px-4 py-3 rounded-md flex items-start gap-2"
          style={{
            background: message.type === 'error' ? c.dangerSoft : (message.type === 'warn' ? c.accentSoft : c.successSoft),
            color: message.type === 'error' ? c.danger : (message.type === 'warn' ? c.accent : c.success),
            fontFamily: fMono, fontSize: 12,
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 1 }}/>
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8 }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${c.border}` }}>
          <span style={{ fontFamily: fMono, fontSize: 11, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {list.length} recipient{list.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" icon={RotateCw} onClick={load}>Refresh</Btn>
            {list.length > 0 && (
              <>
                <Btn variant="ghost" size="sm" icon={Sparkles} onClick={() => generateAll(true)} disabled={busy}>Recompose all</Btn>
                <Btn variant="primary" size="sm" icon={Send} onClick={sendAll} disabled={busy}>Send all drafts</Btn>
                <Btn variant="danger" size="sm" icon={Trash2} onClick={clearAll}>Clear all</Btn>
              </>
            )}
          </div>
        </div>

        {loading && <div className="p-8 text-center" style={{ color: c.textMuted }}>Loading…</div>}
        {!loading && list.length === 0 && (
          <div className="p-12 text-center" style={{ color: c.textMuted }}>
            <Upload size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }}/>
            <p style={{ fontFamily: fDisplay, fontSize: 22 }}>No recipients yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Upload a CSV with the recruiters you want to contact.</p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div>
            {list.map((r) => (
              <div key={r.id} style={{ borderTop: `1px solid ${c.border}` }}>
                <div className="px-4 py-3 grid grid-cols-12 gap-3 items-center" style={{ fontSize: 13 }}>
                  <button onClick={() => toggleExpand(r.id)} style={{ color: c.textMuted, justifySelf: 'start' }}>
                    {expanded[r.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                  </button>
                  <div className="col-span-3" style={{ color: c.text }}>
                    <div>{r.name || '—'}</div>
                    <div style={{ color: c.textMuted, fontSize: 11, fontFamily: fMono }}>{r.email}</div>
                  </div>
                  <div className="col-span-3" style={{ color: c.textDim }}>
                    {r.company || '—'}
                    {r.role && <div style={{ color: c.textMuted, fontSize: 11 }}>{r.role}</div>}
                  </div>
                  <div className="col-span-2">
                    <StatusPill status={r.send_status || r.status} />
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1">
                    <Btn
                      variant="ghost"
                      size="sm"
                      icon={Send}
                      onClick={() => sendOne(r)}
                      disabled={busy || !r.draft_subject || r.send_status === 'sent'}
                    >{r.send_status === 'sent' ? 'Sent' : 'Send'}</Btn>
                    <button onClick={() => removeOne(r.id)} style={{ color: c.textMuted, padding: 6 }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                {expanded[r.id] && (
                  <div className="px-10 pb-5" style={{ background: c.bg }}>
                    {r.draft_subject ? (
                      <div>
                        <div className="mb-3">
                          <span style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Subject</span>
                          <div style={{ marginTop: 4, color: c.text, fontSize: 14 }}>{r.draft_subject}</div>
                        </div>
                        <div>
                          <span style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Body</span>
                          <pre style={{
                            marginTop: 4, color: c.text, fontSize: 13, fontFamily: fBody,
                            whiteSpace: 'pre-wrap', background: c.surface, padding: 14, borderRadius: 6, border: `1px solid ${c.border}`,
                          }}>
{r.draft_body}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: c.textMuted, fontSize: 13, padding: '16px 0' }}>
                        No draft yet. Click <span style={{ color: c.accent }}>Generate AI emails</span> above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === 'sent') return <Pill kind="success">sent</Pill>;
  if (status === 'failed') return <Pill kind="danger">failed</Pill>;
  if (status === 'draft' || status === 'drafted') return <Pill kind="accent">drafted</Pill>;
  return <Pill>pending</Pill>;
}
