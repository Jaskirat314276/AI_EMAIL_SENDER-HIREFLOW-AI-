import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { api } from './api.js';
import { c, fBody, fDisplay, fMono, FONTS_LINK } from './design.js';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Btn from './components/Btn.jsx';
import Profile from './views/Profile.jsx';
import Recipients from './views/Recipients.jsx';

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, connected: false, user: null });
  const [view, setView] = useState('recipients');

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      window.history.replaceState({}, '', window.location.pathname);
      checkAuth();
    }
  }, []);

  async function checkAuth() {
    try {
      const r = await api.auth.me();
      setAuthState({ loading: false, connected: r.connected, user: r.user || null });
    } catch (err) {
      setAuthState({ loading: false, connected: false, user: null });
    }
  }

  async function logout() {
    try { await api.auth.logout(); } catch {}
    setAuthState({ loading: false, connected: false, user: null });
  }

  return (
    <>
      <style>{`
        @import url('${FONTS_LINK}');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: ${c.borderHi}; }
      `}</style>

      <div className="flex" style={{
        background: c.bg, color: c.text, height: '100vh',
        fontFamily: fBody, overflow: 'hidden',
        backgroundImage: `radial-gradient(circle at 0% 0%, rgba(232, 168, 56, 0.04), transparent 40%)`,
      }}>
        {authState.loading && <Loading />}
        {!authState.loading && !authState.connected && <ConnectGate onConnected={checkAuth} />}
        {!authState.loading && authState.connected && (
          <>
            <Sidebar view={view} setView={setView} user={authState.user} onLogout={logout} />
            <main className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
              <TopBar
                eyebrow={view === 'recipients' ? 'Workspace' : 'Workspace · Settings'}
                title={view === 'recipients' ? 'Recipients' : 'Profile'}
              />
              <div className="flex-1" style={{ overflow: 'hidden' }}>
                {view === 'recipients' && <Recipients />}
                {view === 'profile'    && <Profile />}
              </div>
            </main>
          </>
        )}
      </div>
    </>
  );
}

function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: c.textMuted, fontFamily: fMono, fontSize: 12 }}>
      Loading…
    </div>
  );
}

function ConnectGate({ onConnected }) {
  return (
    <div className="flex-1 flex items-center justify-center px-10" style={{ fontFamily: fBody }}>
      <div className="text-center" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-center mb-6">
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: c.accent, color: '#1a1208',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={26}/>
          </div>
        </div>
        <h1 style={{ fontFamily: fDisplay, fontSize: 42, lineHeight: 1.05, color: c.text, margin: 0, fontWeight: 400 }}>
          Connect your Gmail
        </h1>
        <p style={{ color: c.textDim, marginTop: 14, marginBottom: 26, fontSize: 15 }}>
          HireFlow sends cold emails through your own Gmail so they look personal and land in inboxes — not spam folders.
          We only request the <span style={{ color: c.text }}>gmail.send</span> scope.
        </p>
        <a href={api.auth.connectUrl()} style={{ textDecoration: 'none' }}>
          <Btn variant="primary" size="lg" icon={Mail}>Connect Gmail</Btn>
        </a>
        <div style={{ marginTop: 18, color: c.textMuted, fontSize: 11, fontFamily: fMono }}>
          You'll see a Google "unverified app" warning. That's expected in dev mode.
        </div>
      </div>
    </div>
  );
}
