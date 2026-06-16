import { c, fBody, fDisplay, fMono } from '../design.js';

export default function TopBar({ eyebrow, title, actions }) {
  return (
    <header
      className="flex items-end justify-between px-10 py-6"
      style={{ borderBottom: `1px solid ${c.border}`, background: c.bg, fontFamily: fBody }}
    >
      <div>
        {eyebrow && (
          <div style={{ color: c.textMuted, fontFamily: fMono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontFamily: fDisplay, fontSize: 34, lineHeight: 1.1, color: c.text, margin: 0, fontWeight: 400 }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
