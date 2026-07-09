import { X } from 'lucide-react';
import StatusMark from './StatusMark.jsx';
import { c, fMono } from '../design.js';

const EDGE = { sent: c.success, failed: c.danger, sending: c.accent, stuck: c.accent };

// Fixed, stacking toast notifications with an animated status glyph. Fed by the send
// poller in Recipients.jsx: one toast per message as it sends / fails / is in progress.
export default function Toasts({ items = [], onDismiss }) {
  if (!items.length) return null;
  return (
    <div
      style={{
        position: 'fixed', top: 18, right: 18, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, pointerEvents: 'none',
      }}
    >
      {items.map((t) => {
        const edge = EDGE[t.kind] || c.border;
        return (
          <div
            key={t.id}
            className="hf-toast-in"
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 11,
              background: `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
              border: `1px solid ${c.border}`, borderLeft: `2px solid ${edge}`,
              borderRadius: 10, padding: '11px 13px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(6px)',
              fontFamily: fMono, fontSize: 12, color: c.text,
            }}
          >
            <StatusMark kind={t.kind} size={22} />
            <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>{t.text}</span>
            <button
              onClick={() => onDismiss?.(t.id)}
              style={{ color: c.textMuted, flexShrink: 0, lineHeight: 1 }}
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
