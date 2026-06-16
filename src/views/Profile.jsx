import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RotateCw } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono, fDisplay } from '../design.js';
import Btn from '../components/Btn.jsx';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    load();
  }, []);

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

  if (loading) return <div className="p-10" style={{ color: c.textMuted, fontFamily: fBody }}>Loading profile…</div>;
  if (!profile) return null;

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  return (
    <div className="px-10 py-8 overflow-y-auto" style={{ fontFamily: fBody, color: c.text, height: '100%' }}>
      <div className="flex items-center justify-between mb-6">
        <p style={{ color: c.textDim, maxWidth: 640 }}>
          This profile is used to write every email. Keep it tight — the AI picks the most relevant skills, projects, and metrics for each recipient.
        </p>
        <div className="flex items-center gap-2">
          {message && (
            <span style={{
              color: message.type === 'ok' ? c.success : c.danger,
              fontFamily: fMono, fontSize: 12,
            }}>{message.text}</span>
          )}
          <Btn variant="ghost" icon={RotateCw} onClick={load}>Reload</Btn>
          <Btn variant="primary" icon={Save} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
        </div>
      </div>

      <Section title="Basics">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={profile.name} onChange={(v) => set('name', v)} />
          <Field label="Email" value={profile.email} onChange={(v) => set('email', v)} />
          <Field label="Phone" value={profile.phone} onChange={(v) => set('phone', v)} />
          <Field label="Location" value={profile.location} onChange={(v) => set('location', v)} />
          <Field label="Target role" value={profile.target_role} onChange={(v) => set('target_role', v)} full />
        </div>
      </Section>

      <Section title="Summary">
        <TextArea value={profile.summary} onChange={(v) => set('summary', v)} rows={4} />
      </Section>

      <Section title="Skills">
        <SkillEditor skills={profile.skills} onChange={(s) => set('skills', s)} />
      </Section>

      <Section title="Experience">
        <ExperienceEditor items={profile.experience} onChange={(e) => set('experience', e)} />
      </Section>

      <Section title="Projects">
        <ProjectEditor items={profile.projects} onChange={(p) => set('projects', p)} />
      </Section>

      <Section title="Links">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Portfolio" value={profile.links?.portfolio || ''} onChange={(v) => set('links', { ...profile.links, portfolio: v })} />
          <Field label="LinkedIn" value={profile.links?.linkedin || ''} onChange={(v) => set('links', { ...profile.links, linkedin: v })} />
          <Field label="GitHub" value={profile.links?.github || ''} onChange={(v) => set('links', { ...profile.links, github: v })} />
          <Field label="LeetCode" value={profile.links?.leetcode || ''} onChange={(v) => set('links', { ...profile.links, leetcode: v })} />
        </div>
      </Section>

      <Section title="Email Template">
        <div style={{ color: c.textDim, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
          This is the exact email that goes out to every recipient. Use{' '}
          <code style={{ color: c.accent, fontFamily: fMono, fontSize: 12 }}>{'{{first_name}}'}</code> and{' '}
          <code style={{ color: c.accent, fontFamily: fMono, fontSize: 12 }}>{'{{company}}'}</code> where you want them swapped per recipient.
          <div style={{ marginTop: 6, color: c.textMuted, fontSize: 12 }}>
            Available placeholders: <code style={{ fontFamily: fMono }}>{'{{name}} {{first_name}} {{last_name}} {{email}} {{company}} {{role}} {{linkedin}}'}</code>
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
              padding: '12px 14px', borderRadius: 6, fontFamily: fBody, fontSize: 14,
              lineHeight: 1.55, outline: 'none', resize: 'vertical',
            }}
            onFocus={(e) => e.target.style.borderColor = c.accent}
            onBlur={(e) => e.target.style.borderColor = c.border}
          />
        </label>
      </Section>

      <div className="text-xs mt-8 pb-6" style={{ color: c.textMuted, fontFamily: fMono }}>
        Last updated: {profile.updated_at || '—'}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 style={{ fontFamily: fDisplay, fontSize: 22, fontWeight: 400, marginBottom: 14, color: c.text }}>{title}</h2>
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 18 }}>
        {children}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, full }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? 'col-span-2' : ''}`}>
      <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: c.bg, border: `1px solid ${c.border}`, color: c.text,
          padding: '8px 10px', borderRadius: 6, fontFamily: fBody, fontSize: 14, outline: 'none',
        }}
        onFocus={(e) => e.target.style.borderColor = c.accent}
        onBlur={(e) => e.target.style.borderColor = c.border}
      />
    </label>
  );
}

function TextArea({ value, onChange, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      style={{
        width: '100%', background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        padding: '10px 12px', borderRadius: 6, fontFamily: fBody, fontSize: 14, outline: 'none', resize: 'vertical',
      }}
      onFocus={(e) => e.target.style.borderColor = c.accent}
      onBlur={(e) => e.target.style.borderColor = c.border}
    />
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
            padding: '8px 10px', borderRadius: 6, fontFamily: fBody, fontSize: 14, outline: 'none',
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
        <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: 12 }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="Company" value={x.company} onChange={(v) => update(i, 'company', v)} />
            <Field label="Title"   value={x.title}   onChange={(v) => update(i, 'title', v)} />
            <Field label="Period"  value={x.period}  onChange={(v) => update(i, 'period', v)} />
          </div>
          <div className="flex flex-col gap-2">
            {(x.bullets || []).map((b, bi) => (
              <div key={bi} className="flex gap-2 items-start">
                <span style={{ color: c.textMuted, marginTop: 8 }}>•</span>
                <textarea
                  value={b}
                  onChange={(e) => updateBullet(i, bi, e.target.value)}
                  rows={2}
                  style={{
                    flex: 1, background: c.surfaceHi, border: `1px solid ${c.border}`, color: c.text,
                    padding: '6px 8px', borderRadius: 4, fontFamily: fBody, fontSize: 13, outline: 'none',
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
        <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: 12 }}>
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
                padding: '8px 10px', borderRadius: 6, fontFamily: fMono, fontSize: 13, outline: 'none',
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
                padding: '8px 10px', borderRadius: 6, fontFamily: fBody, fontSize: 13, outline: 'none',
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
