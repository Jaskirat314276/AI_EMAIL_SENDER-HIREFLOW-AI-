import { useState } from 'react';
import { c, fBody } from '../design.js';

export default function Btn({ children, onClick, variant = 'primary', icon: Icon, size = 'md', disabled = false, type = 'button' }) {
  const variants = {
    primary: { bg: c.accent, fg: '#1a1208', border: c.accent, hover: '#f0b449' },
    ghost:   { bg: 'transparent', fg: c.text, border: c.border, hover: c.surface },
    dark:    { bg: c.surfaceHi, fg: c.text, border: c.border, hover: c.border },
    danger:  { bg: 'transparent', fg: c.danger, border: c.border, hover: c.dangerSoft },
  }[variant];
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }[size];
  const [hov, setHov] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`${sizes} rounded-md inline-flex items-center gap-2 transition-all`}
      style={{
        background: disabled ? c.surface : (hov ? variants.hover : variants.bg),
        color: disabled ? c.textMuted : variants.fg,
        border: `1px solid ${variants.border}`,
        fontFamily: fBody, fontWeight: 500,
        transform: hov && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: hov && !disabled && variant === 'primary' ? `0 6px 20px ${c.accentSoft}` : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {Icon && <Icon size={14}/>}
      {children}
    </button>
  );
}
