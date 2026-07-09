import { c } from '../design.js';

// Animated status glyph: a drawn tick (sent), a drawn X (failed), or a spinner
// (sending / stuck). Pure SVG + CSS (keyframes live in index.css); no deps.
const COLOR = { sent: c.success, failed: c.danger, sending: c.accent, stuck: c.accent };

export default function StatusMark({ kind = 'sent', size = 20 }) {
  const color = COLOR[kind] || c.accent;

  if (kind === 'sending' || kind === 'stuck') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0 }} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" />
        <path className="hf-spin" d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'failed') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="hf-pop" style={{ flexShrink: 0 }} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1.8" />
        <path className="hf-draw" pathLength="1" d="M8.5 8.5 L15.5 15.5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <path className="hf-draw" pathLength="1" d="M15.5 8.5 L8.5 15.5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // sent
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="hf-pop" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1.8" />
      <path className="hf-draw" pathLength="1" d="M7 12.5 l3.2 3.2 L17 8.2" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
