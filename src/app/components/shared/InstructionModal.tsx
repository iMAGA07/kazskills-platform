import React from 'react';
import { INSTRUCTION_STEPS, SUPPORT_WHATSAPP_DISPLAY, whatsappLink, SUPPORT_PREFILL } from '../../lib/platformInfo';
import { IcClose } from '../Icons';

const NAVY = '#1B3D84';
const BLUE = '#2B5CE6';

export function InstructionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,22,41,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px', borderBottom: '1px solid #EEF1F8',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#EBF1FE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>📘</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1629' }}>
              Краткая инструкция
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              Как работать с платформой KAZSKILLS
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #E3E7F0',
            background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={14} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {INSTRUCTION_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: NAVY, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F1629' }}>{s.title}</div>
                  {s.body && (
                    <div style={{ fontSize: 13, color: '#4B5563', marginTop: 2, lineHeight: 1.5 }}>{s.body}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Support */}
          <div style={{
            marginTop: 18, padding: '14px 16px', borderRadius: 12,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
              Служба поддержки
            </div>
            <div style={{ fontSize: 12.5, color: '#15803D', lineHeight: 1.55, marginBottom: 10 }}>
              Если возникнут вопросы или технические сложности — напишите нам в WhatsApp.
              В сообщении укажите ваше ФИО, организацию и должность, а также описание проблемы.
            </div>
            <a
              href={whatsappLink(SUPPORT_PREFILL)}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 9, background: '#25D366',
                color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}
            >
              <WhatsAppGlyph size={16} color="#fff" />
              Написать в WhatsApp · {SUPPORT_WHATSAPP_DISPLAY}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #EEF1F8', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: BLUE, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          }}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppGlyph({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

/**
 * Floating WhatsApp button shown on every screen (hover bottom-right).
 * Opens the support chat with a prefilled message template.
 */
export function WhatsAppFab() {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={whatsappLink(SUPPORT_PREFILL)}
      target="_blank" rel="noopener noreferrer"
      title="Связаться с поддержкой в WhatsApp"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 1500,
        display: 'inline-flex', alignItems: 'center', gap: 10,
        height: 54, borderRadius: 999,
        padding: hover ? '0 20px 0 16px' : '0',
        width: hover ? 'auto' : 54,
        justifyContent: 'center',
        background: '#25D366', color: '#fff', textDecoration: 'none',
        boxShadow: '0 6px 20px rgba(37,211,102,0.45)',
        transition: 'all 0.2s ease',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, flexShrink: 0 }}>
        <WhatsAppGlyph size={28} color="#fff" />
      </span>
      {hover && (
        <span style={{ fontSize: 14, fontWeight: 600, paddingRight: 4 }}>
          Поддержка
        </span>
      )}
    </a>
  );
}
