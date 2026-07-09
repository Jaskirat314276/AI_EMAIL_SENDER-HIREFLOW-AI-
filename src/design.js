export const c = {
  bg: '#0c0a08',
  surface: '#15110d',
  surfaceHi: '#1d1813',
  border: '#2a231c',
  borderHi: '#3d352b',
  text: '#f5efe4',
  textDim: '#a39685',
  textMuted: '#6b6053',
  accent: '#e8a838',
  accentDim: '#9c7321',
  accentSoft: 'rgba(232, 168, 56, 0.12)',
  success: '#7ba368',
  successSoft: 'rgba(123, 163, 104, 0.15)',
  danger: '#c45a4a',
  dangerSoft: 'rgba(196, 90, 74, 0.12)',
  info: '#6892b8',
};

export const fDisplay = "'Instrument Serif', 'Times New Roman', serif";
export const fBody = "'Inter Tight', -apple-system, system-ui, sans-serif";
export const fMono = "'JetBrains Mono', ui-monospace, monospace";

export const FONTS_LINK =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';

// ── Elevated surface tokens (modular redesign) ──────────────────
export const grad = {
  card:   `linear-gradient(180deg, ${c.surface}, ${c.bg})`,
  panel:  `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
  accent: `linear-gradient(135deg, ${c.accent}, ${c.accentDim})`,
};
export const shadow = {
  sm:   '0 4px 16px rgba(0,0,0,0.28)',
  md:   '0 10px 32px rgba(0,0,0,0.40)',
  glow: `0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px ${c.accentSoft}`,
};
export const radii = { sm: 8, md: 12, lg: 16 };
