import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';

// ── Jitsi prototype (Phase 0) ───────────────────────────────────────────────
// Embeds a Jitsi room via the official External API against the public
// meet.jit.si instance — zero infrastructure. For production this domain is
// swapped for a self-hosted Jitsi (meet.kazskills.kz) with JWT auth.
declare global {
  interface Window { JitsiMeetExternalAPI?: any }
}

const JITSI_DOMAIN = 'meet.jit.si';

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const existing = document.getElementById('jitsi-external-api') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('load failed')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'jitsi-external-api';
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load failed'));
    document.body.appendChild(s);
  });
}

function currentUserName(): string {
  try { return JSON.parse(localStorage.getItem('kazskills_user') || '{}')?.name || ''; }
  catch { return ''; }
}

export default function VideoRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let disposed = false;
    const safe = (roomId || 'lobby').replace(/[^a-zA-Z0-9_-]/g, '');
    const roomName = `kazskills_${safe}`;
    const displayName = currentUserName();

    loadJitsiScript().then(() => {
      if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: displayName ? { displayName } : undefined,
        configOverwrite: {
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
        },
      });
      apiRef.current.addEventListener('readyToClose', () => navigate('/'));
    }).catch(() => setError('Не удалось загрузить видеомодуль. Проверьте интернет или блокировщики.'));

    return () => { disposed = true; try { apiRef.current?.dispose(); } catch { /* noop */ } };
  }, [roomId, navigate]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0e14', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', background: '#11151f', color: '#E5E9F0', fontSize: 13, fontWeight: 600,
        borderBottom: '1px solid #1d2330',
      }}>
        <span>KAZSKILLS · онлайн-комната: <span style={{ color: '#7BA0FF' }}>{roomId}</span></span>
        <button onClick={copyLink}
          style={{ background: copied ? '#16a34a' : '#2B5CE6', color: '#fff', border: 0, borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {copied ? 'Скопировано ✓' : 'Скопировать ссылку'}
        </button>
      </div>
      {error
        ? <div style={{ color: '#fca5a5', padding: 24, fontSize: 14 }}>{error}</div>
        : <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />}
    </div>
  );
}
