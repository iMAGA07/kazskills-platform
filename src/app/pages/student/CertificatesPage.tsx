import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';
import { Logo } from '../../components/shared/Logo';
import {
  IcMedal, IcDownload, IcEye, IcClose, IcCheckCircle, IcShield, IcClock,
} from '../../components/Icons';

const NAVY   = '#1B3D84';
const BLUE   = '#2B5CE6';
const GOLD   = '#D97706';
const BORDER = '#E8ECF6';
const FAINT  = '#F4F6FB';
const MUTED  = '#6B7280';

interface CertData {
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  score: number;
  certNumber: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color  = score >= 90 ? '#059669' : score >= 70 ? BLUE : GOLD;
  const bg     = score >= 90 ? '#D1FAE5' : score >= 70 ? '#EBF1FE' : '#FEF3C7';
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color, background: bg }}>
      {score}%
    </span>
  );
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { courses, getProgress } = useCourses();
  const [viewCert, setViewCert] = useState<CertData | null>(null);
  const [certs, setCerts] = useState<CertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || courses.length === 0) { setLoading(false); return; }
    const published = courses.filter(c => c.published);
    Promise.all(published.map(c => getProgress(user.id, c.id)))
      .then(progresses => {
        const completed: CertData[] = [];
        progresses.forEach((p, i) => {
          if (p.status === 'completed') {
            const lastAttempt = p.attempts?.[p.attempts.length - 1];
            const course = published[i];
            const year = new Date(lastAttempt?.completedAt ?? Date.now()).getFullYear();
            completed.push({
              courseId: course.id,
              courseTitle: course.title,
              issuedAt: lastAttempt?.completedAt ?? new Date().toISOString(),
              score: lastAttempt?.score ?? 100,
              certNumber: `KZ-${year}-${course.id.slice(-6).toUpperCase()}`,
            });
          }
        });
        setCerts(completed);
      }).catch(console.error).finally(() => setLoading(false));
  }, [user, courses]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>{t('certificates.title')}</h1>
          <p style={{ color: MUTED, margin: 0, fontSize: '13.5px' }}>
            Ваши сертификаты о прохождении курсов на платформе Kazskills
          </p>
        </div>
        {!loading && certs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px',
            background: '#EBF1FE', border: `1px solid #BFDBFE`,
          }}>
            <IcMedal size={16} color={BLUE} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: BLUE }}>
              {certs.length} {certs.length === 1 ? 'сертификат' : certs.length < 5 ? 'сертификата' : 'сертификатов'}
            </span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '80px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
          Загрузка сертификатов...
        </div>
      )}

      {/* Empty */}
      {!loading && certs.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '80px 24px',
          textAlign: 'center', border: `1px solid ${BORDER}`,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #EBF1FE, #F4F6FB)',
            border: `2px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <IcMedal size={36} color={BLUE} />
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#374151', fontSize: '16px', fontWeight: 700 }}>
            {t('certificates.empty')}
          </h3>
          <p style={{ color: MUTED, margin: 0, fontSize: '14px', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {t('certificates.empty_desc')}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && certs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
          {certs.map(cert => (
            <div
              key={cert.courseId}
              style={{
                background: '#fff', borderRadius: '14px', overflow: 'hidden',
                border: `1px solid ${BORDER}`, transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(43,92,230,0.12)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Top stripe */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${NAVY}, ${BLUE}, ${GOLD})` }} />

              {/* Card header */}
              <div style={{ padding: '18px 20px 14px', background: FAINT, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IcMedal size={22} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: '2px' }}>
                      СЕРТИФИКАТ
                    </div>
                    <div style={{ fontSize: '11px', color: MUTED, fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                      {cert.certNumber}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 600, color: '#059669', background: '#D1FAE5',
                    flexShrink: 0,
                  }}>
                    ✓ Действителен
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '18px 20px 20px' }}>
                <h4 style={{ margin: '0 0 16px', color: '#0F1629', fontSize: '14px', fontWeight: 700, lineHeight: 1.4 }}>
                  {cert.courseTitle}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: MUTED, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <IcClock size={12} color={MUTED} /> Дата выдачи
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                      {new Date(cert.issuedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: MUTED, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <IcCheckCircle size={12} color={MUTED} /> Результат
                    </span>
                    <ScoreBadge score={cert.score} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: MUTED, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <IcShield size={12} color={MUTED} /> Организация
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>Kazskills</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: BORDER, marginBottom: '16px' }} />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setViewCert(cert)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: '9px',
                      border: `1.5px solid ${BORDER}`, background: '#fff',
                      color: '#374151', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontSize: '12.5px', fontWeight: 500, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE;
                      (e.currentTarget as HTMLButtonElement).style.color = BLUE;
                      (e.currentTarget as HTMLButtonElement).style.background = '#F0F5FF';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLButtonElement).style.color = '#374151';
                      (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                    }}
                  >
                    <IcEye size={14} color="currentColor" />
                    {t('certificates.view')}
                  </button>
                  <button
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: '9px',
                      border: `1.5px solid #A7F3D0`, background: '#ECFDF5',
                      color: '#059669', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontSize: '12.5px', fontWeight: 500, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#D1FAE5';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#ECFDF5';
                    }}
                  >
                    <IcDownload size={14} color="#059669" />
                    {t('certificates.download')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Certificate viewer modal ── */}
      {viewCert && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(8px)', padding: '24px',
          }}
          onClick={() => setViewCert(null)}
        >
          <div style={{ maxWidth: 660, width: '100%' }} onClick={e => e.stopPropagation()}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => setViewCert(null)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              >
                <IcClose size={16} color="#fff" />
              </button>
            </div>

            {/* Certificate document */}
            <div style={{
              background: '#fff', borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
            }}>
              {/* Top gradient bar */}
              <div style={{ height: 5, background: `linear-gradient(90deg, ${NAVY} 0%, ${BLUE} 50%, ${GOLD} 100%)` }} />

              <div style={{ padding: '44px 52px 40px', position: 'relative' }}>
                {/* Corner accents */}
                {(['tl','tr','bl','br'] as const).map(c => (
                  <div key={c} style={{
                    position: 'absolute',
                    ...(c.includes('t') ? { top: '16px' } : { bottom: '16px' }),
                    ...(c.includes('l') ? { left: '16px' } : { right: '16px' }),
                    width: 24, height: 24, borderColor: GOLD, borderStyle: 'solid',
                    borderWidth:
                      c === 'tl' ? '2px 0 0 2px' :
                      c === 'tr' ? '2px 2px 0 0' :
                      c === 'bl' ? '0 0 2px 2px' : '0 2px 2px 0',
                    borderRadius: c === 'tl' ? '2px 0 0 0' : c === 'tr' ? '0 2px 0 0' : c === 'bl' ? '0 0 0 2px' : '0 0 2px 0',
                    opacity: 0.6,
                  }} />
                ))}

                {/* Content */}
                <div style={{ textAlign: 'center' }}>
                  {/* Logo */}
                  <div style={{ marginBottom: '20px' }}>
                    <Logo size="sm" variant="full" onDark={false} />
                  </div>

                  {/* Label */}
                  <div style={{
                    display: 'inline-block', padding: '4px 20px',
                    border: `1px solid ${GOLD}`, borderRadius: '20px',
                    fontSize: '10px', letterSpacing: '0.18em', color: GOLD, fontWeight: 700,
                    marginBottom: '20px',
                  }}>
                    СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА
                  </div>

                  <p style={{ color: MUTED, fontSize: '13px', margin: '0 0 6px' }}>
                    настоящим подтверждает, что
                  </p>

                  {/* Name */}
                  <h2 style={{ color: '#0F1629', margin: '0 0 4px', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    {user.name}
                  </h2>
                  <p style={{ color: MUTED, fontSize: '13px', margin: '0 0 6px' }}>
                    {user.position}{user.position && user.organization ? ' · ' : ''}{user.organization}
                  </p>
                  <p style={{ color: '#9CA3AF', fontSize: '13px', margin: '0 0 22px' }}>
                    успешно завершил(а) курс
                  </p>

                  {/* Course title */}
                  <div style={{
                    padding: '14px 28px', borderRadius: '10px',
                    background: '#EBF1FE', border: `1px solid #BFDBFE`,
                    marginBottom: '28px',
                  }}>
                    <h3 style={{ margin: 0, color: NAVY, fontSize: '15px', fontWeight: 700 }}>
                      {viewCert.courseTitle}
                    </h3>
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex', justifyContent: 'center', gap: '0',
                    marginBottom: '24px', border: `1px solid ${BORDER}`,
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    {[
                      { label: 'Дата выдачи', val: new Date(viewCert.issuedAt).toLocaleDateString('ru-RU') },
                      { label: 'Результат',   val: `${viewCert.score}%` },
                      { label: 'Номер',       val: viewCert.certNumber },
                    ].map(({ label, val }, i, arr) => (
                      <div key={label} style={{
                        flex: 1, padding: '12px 10px', textAlign: 'center',
                        borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                        background: i % 2 === 1 ? FAINT : '#fff',
                      }}>
                        <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: '#0F1629', fontWeight: 700, fontFamily: label === 'Номер' ? 'monospace' : 'inherit' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <IcShield size={13} color={BLUE} />
                    <span style={{ fontSize: '11.5px', color: BLUE, fontWeight: 500 }}>
                      Аккредитовано · Kazskills Learning Platform
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}