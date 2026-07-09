import { c, grad, fDisplay, fMono, radii } from '../design.js';

// A KPI tile: big serif number, mono label, optional amber accent bar + icon.
export default function StatTile({ label, value, hint, accent = false, icon: Icon, style }) {
  return (
    <div
      style={{
        flex: 1, minWidth: 128, position: 'relative', overflow: 'hidden',
        background: grad.card, border: `1px solid ${c.border}`, borderRadius: radii.md,
        padding: '13px 15px', ...style,
      }}
    >
      {accent && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 10, bottom: 10, left: 0, width: 2, borderRadius: 99, background: c.accent, boxShadow: `0 0 12px ${c.accent}` }}
        />
      )}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: fMono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textMuted }}>{label}</span>
        {Icon && <Icon size={13} style={{ color: accent ? c.accent : c.textMuted }} />}
      </div>
      <div style={{ fontFamily: fDisplay, fontSize: 30, lineHeight: 1.1, marginTop: 6, color: accent ? c.accent : c.text }}>{value}</div>
      {hint && <div style={{ fontFamily: fMono, fontSize: 10, color: c.textMuted, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}
