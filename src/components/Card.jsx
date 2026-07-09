import { c, grad, shadow, radii } from '../design.js';

// Elevated surface: gradient fill, hairline border, soft shadow, and a faint top
// highlight. `glow` adds an amber ring; `pad` toggles default padding.
export default function Card({ children, style, glow = false, pad = false, className = '', ...rest }) {
  return (
    <div
      className={`hf-card ${className}`}
      style={{
        position: 'relative',
        background: grad.card,
        border: `1px solid ${c.border}`,
        borderRadius: radii.lg,
        boxShadow: glow ? shadow.glow : shadow.sm,
        overflow: 'hidden',
        ...(pad ? { padding: 18 } : null),
        ...style,
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(245,239,228,0.09), transparent)',
        }}
      />
      {children}
    </div>
  );
}
