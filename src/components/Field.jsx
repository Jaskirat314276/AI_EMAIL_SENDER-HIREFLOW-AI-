import { c, fBody, fMono } from '../design.js';

export function Field({ label, value, onChange, full, type = 'text', placeholder }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? 'col-span-2' : ''}`}>
      <span style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ''}
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

export function TextArea({ value, onChange, rows = 3 }) {
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
