import { c, fMono } from '../design.js';

export default function Pill({ children, kind = 'neutral' }) {
  const styles = {
    neutral: { bg: c.surfaceHi, fg: c.textDim, border: c.border },
    accent:  { bg: c.accentSoft, fg: c.accent, border: 'transparent' },
    success: { bg: c.successSoft, fg: c.success, border: 'transparent' },
    danger:  { bg: c.dangerSoft, fg: c.danger, border: 'transparent' },
  }[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
      style={{
        background: styles.bg, color: styles.fg,
        border: `1px solid ${styles.border}`,
        fontFamily: fMono, fontSize: 10, letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {kind === 'success' && <span style={{ width: 5, height: 5, borderRadius: 99, background: c.success, boxShadow: `0 0 6px ${c.success}` }}/>}
      {children}
    </span>
  );
}
