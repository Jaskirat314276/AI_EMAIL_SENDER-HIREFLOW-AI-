import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RotateCw } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono, fDisplay } from '../design.js';
import Btn from '../components/Btn.jsx';
import Card from '../components/Card.jsx';
import { Field, TextArea } from '../components/Field.jsx';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pace, setPace] = useState(null);      // { min_delay_s, max_delay_s, daily_cap }
  const [pacing, setPacing] = useState(false);

  useEffect(() => {
    load();
    loadPace();
  }, []);

  async function loadPace() {
    try {
      const st = await api.send.queue.status();
      const s = st.settings || {};
      setPace({
        min_delay_s: Math.round((s.min_delay_ms ?? 60000) / 1000),
        max_delay_s: Math.round((s.max_delay_ms ?? 120000) / 1000),
        daily_cap: s.daily_cap ?? 40,
      });
    } catch { /* pace endpoint unavailable — hide the section */ }
  }

  async function savePace() {
    if (!pace) return;
    const min = Number(pace.min_delay_s);
    const max = Number(pace.max_delay_s);
    const cap = Number(pace.daily_cap);
    if ([min, max, cap].some((n) => !Number.isFinite(n) || n < 0)) {
      return setMessage({ type: 'error', text: 'Pace values must be non-negative numbers.' });
    }
    if (min > max) return setMessage({ type: 'error', text: 'Min delay must be ≤ max delay.' });
    setPacing(true);
    setMessage(null);
    try {
      const saved = await api.send.queue.settings({
        min_delay_ms: Math.round(min * 1000),
        max_delay_ms: Math.round(max * 1000),
        daily_cap: Math.round(cap),
      });
      setPace({
        min_delay_s: Math.round((saved?.min_delay_ms ?? min * 1000) / 1000),
        max_delay_s: Math.round((saved?.max_delay_ms ?? max * 1000) / 1000),
        daily_cap: saved?.daily_cap ?? cap,
      });
      setMessage({ type: 'ok', text: 'Send pace saved.' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setPacing(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const p = await api.profile.get();
      setProfile(p);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.profile.update(profile);
      setProfile(updated);
      setMessage({ type: 'ok', text: 'Saved' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 12 }}>Loading profile…</div>;
  if (!profile) return (
    <div className="p-10" style={{ fontFamily: fBody, color: c.text }}>
      <p style={{ color: c.danger, fontFamily: fMono, fontSize: 13, marginBottom: 12 }}>
        {message?.text || "Couldn't load your profile."}
      </p>
      <Btn variant="ghost" icon={RotateCw} onClick={load}>Reload</Btn>
    </div>
  );

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  return (
    <div className="px-10 py-8 overflow-y-auto" style={{ fontFamily: fBody, color: c.text, height: '100%' }}>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap hf-rise">
        <p style={{ color: c.textDim, maxWidth: 620, fontSize: 13, lineHeight: 1.5 }}>
          This profile writes every email. Keep it tight — it becomes the voice, credentials, and pitch behind your outreach.
        </p>
        <div className="flex items-center gap-2">
          {message && (
            <span style={{ color: message.type === 'ok' ? c.success : c.danger, fontFamily: fMono, fontSize: 12 }}>{message.text}</span>
          )}
          <Btn variant="ghost" icon={RotateCw} onClick={load}>Reload</Btn>
          <Btn variant="primary" icon={Save} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
        </div>
      </div>

      <div className="hf-rise" style={{ animationDelay: '.04s' }}>
        <Section title="Basics" eyebrow="Identity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={profile.name} onChange={(v) => set('name', v)} />
            <Field label="Email" value={profile.email} onChange={(v) => set('email', v)} />
            <Field label="Phone" value={profile.phone} onChange={(v) => set('phone', v)} />
            <Field label="Location" value={profile.location} onChange={(v) => set('location', v)} />
            <Field label="Target role" value={profile.target_role} onChange={(v) => set('target_role', v)} full />
          </div>
        </Section>

        <Section title="Summary" eyebrow="Pitch">
          <TextArea value={profile.summary} onChange={(v) => set('summary', v)} rows={4} />
        </Section>

        <Section title="Skills" eyebrow="Stack">
          <SkillEditor skills={profile.skills} onChange={(s) => set('skills', s)} />
        </Section>

        <Section title="Experience" eyebrow="Track record">
          <ExperienceEditor items={profile.experience} onChange={(e) => set('experience', e)} />
        </Section>

        <Section title="Projects" eyebrow="Work">
          <ProjectEditor items={profile.projects} onChange={(p) => set('projects', p)} />
        </Section>

        <Section title="Links" eyebrow="Presence">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Portfolio" value={profile.links?.portfolio || ''} onChange={(v) => set('links', { ...profile.links, portfolio: v })} />
            <Field label="LinkedIn" value={profile.links?.linkedin || ''} onChange={(v) => set('links', { ...profile.links, linkedin: v })} />
            <Field label="GitHub" value={profile.links?.github || ''} onChange={(v) => set('links', { ...profile.links, github: v })} />
            <Field label="LeetCode" value={profile.links?.leetcode || ''} onChange={(v) => set('links', { ...profile.links, leetcode: v })} />
          </div>
        </Section>

        <Section title="Email Template" eyebrow="Outreach">
          <div style={{ color: c.textDim, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            This is the exact email that goes out to every recipient. Use{' '}
            <code style={{ color: c.accent, fontFamily: fMono, fontSize: 12 }}>{'{{first_name}}'}</code>,{' '}
            <code style={{ color: c.accent, fontFamily: fMono, fontSize: 12 }}>{'{{apply_role}}'}</code> (the role you're applying for) and{' '}
            <code style={{ color: c.accent, fontFamily: fMono, fontSize: 12 }}>{'{{company}}'}</code> where you want them swapped per recipient.
            <div style={{ marginTop: 6, color: c.textMuted, fontSize: 12 }}>
              Available placeholders: <code style={{ fontFamily: fMono }}>{'{{name}} {{first_name}} {{last_name}} {{email}} {{company}} {{role}} {{apply_role}} {{contact_title}} {{linkedin}}'}</code>
            </div>
            <div style={{ marginTop: 6, color: c.textMuted, fontSize: 12 }}>
              <code style={{ fontFamily: fMono }}>{'{{role}}'}</code> = the contact's job title · <code style={{ fontFamily: fMono }}>{'{{contact_title}}'}</code> = their designation (HR / recruiter / CTO…) · <code style={{ fontFamily: fMono }}>{'{{apply_role}}'}</code> = the role you're applying for.
            </div>
          </div>
          <div className="mb-4">
            <Field label="Subject template" value={profile.subject_template} onChange={(v) => set('subject_template', v)} full />
          </div>
          <label className="flex flex-col gap-1.5">
            <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Body template</span>
            <textarea
              value={profile.body_template || ''}
              onChange={(e) => set('body_template', e.target.value)}
              rows={18}
              style={{
                width: '100%', background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                padding: '12px 14px', borderRadius: 8, fontFamily: fBody, fontSize: 14,
                lineHeight: 1.55, outline: 'none', resize: 'vertical',
              }}
              onFocus={(e) => e.target.style.borderColor = c.accent}
              onBlur={(e) => e.target.style.borderColor = c.border}
            />
          </label>
        </Section>

        {pace && (
          <Section title="Send pace" eyebrow="Delivery">
            <div style={{ color: c.textDim, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Emails drip out at a random delay between min and max, up to the daily cap, so Gmail treats them as human activity.
              <span style={{ color: c.textMuted }}> Safe defaults: 60–120s, cap 40/day.</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Min delay (seconds)" type="number" value={pace.min_delay_s} onChange={(v) => setPace((p) => ({ ...p, min_delay_s: v }))} />
              <Field label="Max delay (seconds)" type="number" value={pace.max_delay_s} onChange={(v) => setPace((p) => ({ ...p, max_delay_s: v }))} />
              <Field label="Daily cap" type="number" value={pace.daily_cap} onChange={(v) => setPace((p) => ({ ...p, daily_cap: v }))} />
            </div>
            <div className="mt-4">
              <Btn variant="primary" icon={Save} onClick={savePace} disabled={pacing}>{pacing ? 'Saving…' : 'Save pace'}</Btn>
            </div>
          </Section>
        )}

        <div className="text-xs mt-2 pb-6" style={{ color: c.textMuted, fontFamily: fMono }}>
          Last updated: {profile.updated_at || '—'}
        </div>
      </div>
    </div>
  );
}

function Section({ title, eyebrow, children }) {
  return (
    <Card className="mb-6" style={{ padding: 0 }}>
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${c.border}` }}>
        {eyebrow && <div style={{ fontFamily: fMono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textMuted, marginBottom: 5 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: fDisplay, fontSize: 22, fontWeight: 400, color: c.text, margin: 0 }}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </Card>
  );
}

function SkillEditor({ skills, onChange }) {
  const [input, setInput] = useState('');
  const list = skills || [];
  function add() {
    const v = input.trim();
    if (!v) return;
    if (!list.includes(v)) onChange([...list, v]);
    setInput('');
  }
  function remove(s) { onChange(list.filter((x) => x !== s)); }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {list.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: c.surfaceHi, color: c.text, border: `1px solid ${c.border}`, fontSize: 12 }}>
            {s}
            <button onClick={() => remove(s)} style={{ color: c.textMuted, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type a skill and press Enter"
          style={{
            flex: 1, background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            padding: '8px 10px', borderRadius: 7, fontFamily: fBody, fontSize: 14, outline: 'none',
          }}
        />
        <Btn variant="ghost" icon={Plus} onClick={add}>Add</Btn>
      </div>
    </div>
  );
}

function ExperienceEditor({ items, onChange }) {
  const list = items || [];
  function update(i, key, val) {
    const next = list.map((x, idx) => idx === i ? { ...x, [key]: val } : x);
    onChange(next);
  }
  function addBullet(i) {
    const next = list.map((x, idx) => idx === i ? { ...x, bullets: [...(x.bullets || []), ''] } : x);
    onChange(next);
  }
  function updateBullet(i, bi, val) {
    const next = list.map((x, idx) => idx === i
      ? { ...x, bullets: x.bullets.map((b, bidx) => bidx === bi ? val : b) }
      : x);
    onChange(next);
  }
  function removeBullet(i, bi) {
    const next = list.map((x, idx) => idx === i
      ? { ...x, bullets: x.bullets.filter((_, bidx) => bidx !== bi) }
      : x);
    onChange(next);
  }
  function removeItem(i) { onChange(list.filter((_, idx) => idx !== i)); }
  function addItem() { onChange([...list, { company: '', title: '', period: '', bullets: [''] }]); }

  return (
    <div className="flex flex-col gap-4">
      {list.map((x, i) => (
        <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14 }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="Company" value={x.company} onChange={(v) => update(i, 'company', v)} />
            <Field label="Title"   value={x.title}   onChange={(v) => update(i, 'title', v)} />
            <Field label="Period"  value={x.period}  onChange={(v) => update(i, 'period', v)} />
          </div>
          <div className="flex flex-col gap-2">
            {(x.bullets || []).map((b, bi) => (
              <div key={bi} className="flex gap-2 items-start">
                <span style={{ color: c.accent, marginTop: 8 }}>•</span>
                <textarea
                  value={b}
                  onChange={(e) => updateBullet(i, bi, e.target.value)}
                  rows={2}
                  style={{
                    flex: 1, background: c.surfaceHi, border: `1px solid ${c.border}`, color: c.text,
                    padding: '6px 8px', borderRadius: 6, fontFamily: fBody, fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={() => removeBullet(i, bi)} style={{ color: c.danger, padding: 4 }}>
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3">
            <Btn variant="ghost" size="sm" icon={Plus} onClick={() => addBullet(i)}>Add bullet</Btn>
            <Btn variant="danger" size="sm" icon={Trash2} onClick={() => removeItem(i)}>Remove</Btn>
          </div>
        </div>
      ))}
      <Btn variant="ghost" icon={Plus} onClick={addItem}>Add experience</Btn>
    </div>
  );
}

function ProjectEditor({ items, onChange }) {
  const list = items || [];
  function update(i, key, val) {
    const next = list.map((x, idx) => idx === i ? { ...x, [key]: val } : x);
    onChange(next);
  }
  function removeItem(i) { onChange(list.filter((_, idx) => idx !== i)); }
  function addItem() { onChange([...list, { name: '', tech: [], description: '', impact: '' }]); }

  return (
    <div className="flex flex-col gap-4">
      {list.map((x, i) => (
        <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14 }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Name"   value={x.name}   onChange={(v) => update(i, 'name', v)} />
            <Field label="Impact (metric)" value={x.impact} onChange={(v) => update(i, 'impact', v)} />
          </div>
          <label className="flex flex-col gap-1.5 mb-3">
            <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tech (comma-separated)</span>
            <input
              value={(x.tech || []).join(', ')}
              onChange={(e) => update(i, 'tech', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              style={{
                background: c.surfaceHi, border: `1px solid ${c.border}`, color: c.text,
                padding: '8px 10px', borderRadius: 7, fontFamily: fMono, fontSize: 13, outline: 'none',
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Description</span>
            <textarea
              value={x.description}
              onChange={(e) => update(i, 'description', e.target.value)}
              rows={3}
              style={{
                background: c.surfaceHi, border: `1px solid ${c.border}`, color: c.text,
                padding: '8px 10px', borderRadius: 7, fontFamily: fBody, fontSize: 13, outline: 'none',
              }}
            />
          </label>
          <div className="flex justify-end mt-3">
            <Btn variant="danger" size="sm" icon={Trash2} onClick={() => removeItem(i)}>Remove</Btn>
          </div>
        </div>
      ))}
      <Btn variant="ghost" icon={Plus} onClick={addItem}>Add project</Btn>
    </div>
  );
}
