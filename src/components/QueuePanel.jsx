import { useEffect, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { api } from '../api.js';
import { c, fBody, fMono } from '../design.js';
import Btn from './Btn.jsx';

function isDone(st) {
  const q = st.counts?.queued || 0;
  const sending = st.counts?.sending || 0;
  return st.status === 'idle' && q === 0 && sending === 0;
}

export default function QueuePanel({ active, onDone }) {
  const [s, setS] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!active) { setS(null); return; }
    let alive = true;
    let id;
    const tick = async () => {
      try {
        const st = await api.send.queue.status();
        if (!alive) return;
        setS(st);
        if (isDone(st)) { clearInterval(id); onDone?.(); }
      } catch { /* keep last snapshot; try again next tick */ }
    };
    tick();
    id = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || !s) return null;

  const counts = s.counts || {};
  const sent = counts.sent || 0;
  const queued = counts.queued || 0;
  const sending = counts.sending || 0;
  const denom = sent + queued + sending;
  const pct = denom ? Math.round((sent / denom) * 100) : 0;
  const paused = s.status === 'paused';
  const cap = s.daily_cap ?? s.settings?.daily_cap ?? '—';

  async function act(fn) {
    setActing(true);
    try {
      await fn();
      const st = await api.send.queue.status();
      setS(st);
      if (isDone(st)) onDone?.();
    } catch { /* surfaced by next poll */ }
    finally { setActing(false); }
  }

  return (
    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${c.border}`, background: c.surfaceHi, fontFamily: fBody }}>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <span style={{ fontFamily: fMono, fontSize: 11, color: c.textDim }}>
          {paused ? 'Paused' : 'Sending'} {sent}/{denom}
          {counts.failed ? ` · ${counts.failed} failed` : ''}
          {` · ${s.remaining ?? (queued + sending)} left`}
          {s.currently_sending ? ` · → ${s.currently_sending}` : ''}
          {` · ${s.sent_today ?? 0}/${cap} today`}
        </span>
        <div className="flex items-center gap-2">
          {paused
            ? <Btn size="sm" variant="ghost" icon={Play} onClick={() => act(api.send.queue.resume)} disabled={acting}>Resume</Btn>
            : <Btn size="sm" variant="ghost" icon={Pause} onClick={() => act(api.send.queue.pause)} disabled={acting}>Pause</Btn>}
          <Btn size="sm" variant="danger" icon={X} onClick={() => act(api.send.queue.cancel)} disabled={acting}>Cancel</Btn>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: c.border, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c.accent, transition: 'width .3s' }} />
      </div>
    </div>
  );
}
