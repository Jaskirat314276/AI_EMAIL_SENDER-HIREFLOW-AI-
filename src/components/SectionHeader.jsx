import { c, fDisplay, fMono } from '../design.js';

// Consistent section heading: mono eyebrow + serif title (+ optional sub & actions).
export default function SectionHeader({ eyebrow, title, sub, actions, style }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap" style={{ marginBottom: 18, ...style }}>
      <div>
        {eyebrow && (
          <div style={{ fontFamily: fMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textMuted, marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{ fontFamily: fDisplay, fontSize: 26, lineHeight: 1.1, color: c.text, margin: 0, fontWeight: 400 }}>{title}</h2>
        {sub && <p style={{ color: c.textDim, fontSize: 13, marginTop: 7, maxWidth: 540, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
