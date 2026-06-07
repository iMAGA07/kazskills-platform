import React, { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from './Toast';
import { IcCamera, IcUpload, IcClose, IcCheck, IcRefresh } from '../Icons';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}

// Centre-crop any image to a portrait 3×4 (600×800) JPEG on a white background —
// keeps uploaded photos in the same official document format as camera shots.
function cropImageTo34(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetAspect = 3 / 4;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const ia = iw / ih;
      let cw: number, ch: number, cx: number, cy: number;
      if (ia > targetAspect) { ch = ih; cw = Math.round(ih * targetAspect); cx = Math.round((iw - cw) / 2); cy = 0; }
      else { cw = iw; ch = Math.round(iw / targetAspect); cx = 0; cy = Math.round((ih - ch) / 2); }
      const outW = 600, outH = 800;
      const cv = document.createElement('canvas');
      cv.width = outW; cv.height = outH;
      const ctx = cv.getContext('2d');
      if (!ctx) { reject(new Error('ctx')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, outW, outH);
      resolve(cv.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('img'));
    img.src = dataUrl;
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the public URL after upload succeeds. */
  onSaved: (url: string) => void;
  title?: string;
  hint?: string;
}

type Tab = 'camera' | 'upload';

/**
 * PhotoCaptureModal — reusable two-tab modal that lets the user either
 * snap a photo from their webcam OR upload a file. The captured/uploaded
 * image is POSTed to /upload-material; the returned public URL is passed
 * back via onSaved. The parent is responsible for persisting that URL
 * (e.g. on user.avatar).
 */
export function PhotoCaptureModal({ open, onClose, onSaved, title, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [tab, setTab] = useState<Tab>('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // dataURL
  const [busy, setBusy] = useState(false);

  // Lifecycle: open camera when the camera tab is active.
  useEffect(() => {
    if (!open || tab !== 'camera') {
      stopStream();
      return;
    }
    if (preview) return; // we've already snapped; don't re-acquire

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        setCameraError(null);
      } catch (e: any) {
        setCameraError(e?.message ?? 'Не удалось включить камеру');
        setCameraReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, tab, preview]);

  // Reset everything when the modal closes.
  useEffect(() => {
    if (!open) {
      stopStream();
      setPreview(null);
      setTab('camera');
      setCameraReady(false);
      setCameraError(null);
      setBusy(false);
    }
  }, [open]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }

  function snap() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const vw = v.videoWidth || 640;
    const vh = v.videoHeight || 480;

    // Document photo is portrait 3×4 (width:height = 3:4 = 0.75). The preview
    // shows a centred 3:4 crop (objectFit: cover), so we must capture the SAME
    // centred crop — otherwise the saved shot includes the torso/sides that
    // weren't visible in the frame ("смещается вбок").
    const targetAspect = 3 / 4;
    const videoAspect = vw / vh;
    let cropW: number, cropH: number, cropX: number, cropY: number;
    if (videoAspect > targetAspect) {
      // video wider than 3:4 → crop the sides
      cropH = vh;
      cropW = Math.round(vh * targetAspect);
      cropX = Math.round((vw - cropW) / 2);
      cropY = 0;
    } else {
      // video taller than 3:4 → crop top/bottom
      cropW = vw;
      cropH = Math.round(vw / targetAspect);
      cropX = 0;
      cropY = Math.round((vh - cropH) / 2);
    }

    // Output at a fixed portrait size for a consistent 3×4 photo.
    const outW = 600, outH = 800;
    c.width = outW; c.height = outH;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // Mirror horizontally so the saved photo matches the mirrored preview the
    // user was looking at (selfie convention).
    ctx.save();
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    ctx.restore();

    const data = c.toDataURL('image/jpeg', 0.92);
    setPreview(data);
    stopStream();
  }

  function retake() {
    setPreview(null);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error('Нужен файл-изображение');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл больше 5 МБ');
      return;
    }
    try {
      const raw = await fileToDataURL(file);
      const cropped = await cropImageTo34(raw);   // centre-crop to official 3×4
      setPreview(cropped);
    } catch {
      toast.error('Не удалось обработать изображение');
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      // dataURL → Blob
      const res = await fetch(preview);
      const blob = await res.blob();
      const filename = `photo-${Date.now()}.jpg`;

      // Two-step direct-to-Storage upload (avoids the Edge Function's 6 MB limit).
      const token = localStorage.getItem('kazskills_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      };
      if (token) headers['x-session-token'] = token;

      const initRes = await fetch(`${BASE}/upload-url`, {
        method: 'POST', headers,
        body: JSON.stringify({ filename, type: blob.type || 'image/jpeg' }),
      });
      if (initRes.status === 401) {
        window.dispatchEvent(new Event('session-expired'));
        throw new Error('Сессия истекла');
      }
      const init = await initRes.json();
      if (!initRes.ok || !init.signedUrl) throw new Error(init.error ?? 'Не удалось получить ссылку');

      const upRes = await fetch(init.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      if (!upRes.ok) throw new Error(`Загрузка не удалась (${upRes.status})`);

      onSaved(init.publicUrl);
      toast.success('Фото сохранено');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Не удалось сохранить фото');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.6)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={() => !busy && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #EEF1F8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: '#EBF1FE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcCamera size={18} color="#2B5CE6" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1629' }}>
              {title ?? 'Фото для сертификата'}
            </div>
            {hint && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{hint}</div>
            )}
          </div>
          <button onClick={() => !busy && onClose()} style={{
            width: 30, height: 30, borderRadius: 7, border: '1px solid #E3E7F0',
            background: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={14} color="#6B7280" />
          </button>
        </div>

        {/* Tabs */}
        {!preview && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 12, background: '#F4F6FB' }}>
            {([
              { key: 'camera', label: 'Снять камерой', Icon: IcCamera },
              { key: 'upload', label: 'Загрузить файл', Icon: IcUpload },
            ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 12px', borderRadius: 8, border: 'none',
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#1B3D84' : '#6B7280',
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 4px rgba(15,22,41,0.08)' : 'none',
                  }}
                >
                  <Icon size={14} color={active ? '#2B5CE6' : '#6B7280'} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 20 }}>
          {preview ? (
            <div style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid #E3E7F0', background: '#000',
              width: 240, maxWidth: '100%', aspectRatio: '3 / 4', margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : tab === 'camera' ? (
            <>
            <div style={{
              borderRadius: 12, overflow: 'hidden', position: 'relative',
              border: '1px solid #E3E7F0', background: '#0F1629',
              width: 240, maxWidth: '100%', aspectRatio: '3 / 4', margin: '0 auto',
            }}>
              <video
                ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {/* Passport-style 3×4 face guide: darken everything except a head
                  oval so the user centres their face like on official documents. */}
              {cameraReady && (
                <svg viewBox="0 0 300 400" preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    <mask id="faceHole">
                      <rect width="300" height="400" fill="white" />
                      <ellipse cx="150" cy="168" rx="86" ry="120" fill="black" />
                    </mask>
                  </defs>
                  <rect width="300" height="400" fill="rgba(15,22,41,0.42)" mask="url(#faceHole)" />
                  <ellipse cx="150" cy="168" rx="86" ry="120" fill="none"
                    stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeDasharray="8 6" />
                  <text x="150" y="372" textAnchor="middle" fill="rgba(255,255,255,0.9)"
                    fontSize="15" fontWeight="600" fontFamily="Arial, sans-serif">Лицо в овале · 3×4</text>
                </svg>
              )}
              {!cameraReady && !cameraError && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13,
                }}>
                  Запрашиваем разрешение на камеру…
                </div>
              )}
              {cameraError && (
                <div style={{
                  position: 'absolute', inset: 0, padding: 20,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', color: '#fff', fontSize: 13, gap: 8,
                  background: 'rgba(15,22,41,0.85)',
                }}>
                  <div>Не удалось включить камеру.</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Разрешите доступ к камере в браузере или используйте вкладку «Загрузить файл».</div>
                </div>
              )}
            </div>
            {/* Capture instructions */}
            <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, background: '#F4F8FF', border: '1px solid #DCE8FF' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1B3D84', marginBottom: 5 }}>
                Фото 3×4 как на документы:
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#475569', lineHeight: 1.65 }}>
                <li>лицо в овале, анфас, прямой взгляд;</li>
                <li>ровный светлый фон (лучше белый);</li>
                <li>без головного убора и тёмных очков;</li>
                <li>хорошее освещение, без бликов.</li>
              </ul>
            </div>
            </>
          ) : (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '36px 20px', borderRadius: 12,
              border: '2px dashed #BFDBFE', background: '#F4F8FF',
              cursor: 'pointer', minHeight: 220,
            }}>
              <IcUpload size={28} color="#2B5CE6" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1B3D84' }}>Выбрать файл</div>
              <div style={{ fontSize: 12.5, color: '#374151', textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
                Загрузите фото <b>3×4 на белом фоне</b> (как на паспорт/документы) для вашего сертификата: лицо анфас, видны плечи.
              </div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>PNG · JPG · до 5 МБ · обрежем до 3×4</div>
              <input
                type="file" accept="image/*"
                onChange={e => handleFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #EEF1F8', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {preview ? (
            <>
              <button onClick={retake} disabled={busy} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 8, border: '1.5px solid #E3E7F0',
                background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}>
                <IcRefresh size={13} color="currentColor" /> Сделать заново
              </button>
              <button onClick={save} disabled={busy} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: busy ? '#9CA3AF' : '#059669', color: '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}>
                <IcCheck size={14} color="#fff" /> {busy ? 'Сохранение…' : 'Сохранить'}
              </button>
            </>
          ) : (
            <>
              {tab === 'camera' && cameraReady && (
                <button onClick={snap} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#2B5CE6', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  <IcCamera size={14} color="#fff" /> Сделать снимок
                </button>
              )}
              <button onClick={onClose} style={{
                padding: '9px 14px', borderRadius: 8, border: '1.5px solid #E3E7F0',
                background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}>
                Отмена
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
