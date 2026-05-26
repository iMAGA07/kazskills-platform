import React, { useEffect, useState } from 'react';

type ToastKind = 'error' | 'success' | 'info';
interface ToastItem { id: number; msg: string; kind: ToastKind; }

let listeners: Array<(msg: string, kind: ToastKind) => void> = [];
let lastShown: Record<string, number> = {};

function dispatch(msg: string, kind: ToastKind) {
  // Throttle identical toasts (debounce within 3s window) — bgFetch can fire many at once.
  const key = `${kind}:${msg}`;
  const now = Date.now();
  if (lastShown[key] && now - lastShown[key] < 3000) return;
  lastShown[key] = now;
  listeners.forEach(l => l(msg, kind));
}

export const toast = {
  error:   (msg: string) => dispatch(msg, 'error'),
  success: (msg: string) => dispatch(msg, 'success'),
  info:    (msg: string) => dispatch(msg, 'info'),
};

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; color: string; icon: string }> = {
  error:   { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', icon: '⚠' },
  success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', icon: '✓' },
  info:    { bg: '#EBF1FE', border: '#BFDBFE', color: '#1E40AF', icon: 'ℹ' },
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const l = (msg: string, kind: ToastKind) => {
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, msg, kind }]);
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 5000);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 380, pointerEvents: 'none',
    }}>
      {items.map(item => {
        const s = KIND_STYLES[item.kind];
        return (
          <div key={item.id} style={{
            background: s.bg, border: `1.5px solid ${s.border}`,
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            boxShadow: '0 8px 24px rgba(15,22,41,0.12)',
            pointerEvents: 'auto',
            animation: 'toast-slide-in 0.2s ease-out',
          }}>
            <span style={{ fontSize: 16, color: s.color, lineHeight: 1, marginTop: 1 }}>{s.icon}</span>
            <span style={{ fontSize: 13, color: s.color, lineHeight: 1.4, flex: 1 }}>{item.msg}</span>
            <button
              onClick={() => setItems(prev => prev.filter(t => t.id !== item.id))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.color, opacity: 0.5, fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >×</button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
