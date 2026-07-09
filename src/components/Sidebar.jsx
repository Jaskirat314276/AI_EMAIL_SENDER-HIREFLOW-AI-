import { Users, User, LogOut, Mail, KanbanSquare } from 'lucide-react';
import { c, fBody, fDisplay, fMono } from '../design.js';

const NAV = [
  { key: 'recipients', label: 'Recipients', icon: Users },
  { key: 'tracker',    label: 'Tracker',    icon: KanbanSquare },
  { key: 'profile',    label: 'Profile',    icon: User  },
];

export default function Sidebar({ view, setView, user, onLogout }) {
  return (
    <aside
      className="flex flex-col"
      style={{
        width: 240, background: c.surface,
        borderRight: `1px solid ${c.border}`,
        fontFamily: fBody,
      }}
    >
      <div className="px-5 py-6 flex items-center gap-2" style={{ borderBottom: `1px solid ${c.border}` }}>
        <div
          className="flex items-center justify-center rounded-md"
          style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${c.accent}, ${c.accentDim})`, color: '#1a1208', boxShadow: `0 0 18px ${c.accentSoft}` }}
        >
          <Mail size={17}/>
        </div>
        <span style={{ fontFamily: fDisplay, fontSize: 22, letterSpacing: '0.01em' }}>HireFlow</span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className="text-left px-3 py-2 rounded-md flex items-center gap-3"
              style={{
                position: 'relative',
                background: active ? c.accentSoft : 'transparent',
                color: active ? c.accent : c.textDim,
                fontSize: 14,
                transition: 'background .18s ease, color .18s ease',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = c.surfaceHi; e.currentTarget.style.color = c.text; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textDim; } }}
            >
              {active && <span style={{ position: 'absolute', left: -3, top: 7, bottom: 7, width: 3, borderRadius: 99, background: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />}
              <Icon size={16}/>
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4" style={{ borderTop: `1px solid ${c.border}` }}>
        <div className="text-xs mb-2" style={{ color: c.textMuted, fontFamily: fMono, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Connected
        </div>
        <button
          onClick={onLogout}
          className="mt-3 text-xs flex items-center gap-1.5"
          style={{ color: c.textMuted, fontFamily: fMono }}
        >
          <LogOut size={11}/> Disconnect
        </button>
      </div>
    </aside>
  );
}
