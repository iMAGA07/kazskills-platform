import React, { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from './Toast';
import { IcCamera, IcUpload, IcClose, IcCheck, IcRefresh } from '../Icons';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
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
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
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
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => toast.error('Не удалось прочитать файл');
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      // Convert dataURL → Blob → multipart upload
      const res = await fetch(preview);
      const blob = await res.blob();
      const form = new FormData();
      form.append('file', blob, `photo-${Date.now()}.jpg`);

      const token = localStorage.getItem('kazskills_token');
      const headers: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}` };
      if (token) headers['x-session-token'] = token;
      const upRes = await fetch(`${BASE}/upload-material`, { method: 'POST', headers, body: form });
      if (upRes.status === 401) {
        window.dispatchEvent(new Event('session-expired'));
        throw new Error('Сессия истекла');
      }
      const data = await upRes.json();
      if (!upRes.ok || !data.url) throw new Error(data.error ?? 'Не удалось загрузить');

      onSaved(data.url);
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
              aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : tab === 'camera' ? (
            <div style={{
              borderRadius: 12, overflow: 'hidden', position: 'relative',
              border: '1px solid #E3E7F0', background: '#0F1629',
              aspectRatio: '4 / 3',
            }}>
              <video
                ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
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
          ) : (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '36px 20px', borderRadius: 12,
              border: '2px dashed #BFDBFE', background: '#F4F8FF',
              cursor: 'pointer', minHeight: 220,
            }}>
              <IcUpload size={28} color="#2B5CE6" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1B3D84' }}>Выбрать файл</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>PNG · JPG · до 5 МБ</div>
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
