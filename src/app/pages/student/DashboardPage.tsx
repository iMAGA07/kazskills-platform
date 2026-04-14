import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import {
  IcBook, IcMedal, IcClock, IcCheckCircle, IcArrowRight, IcPlay,
  IcTrendingUp, IcShield, IcChevronRight,
} from '../../components/Icons';

const NAVY  = '#1B3D84';
const BLUE  = '#2B5CE6';
const BORDER = '#E8ECF6';
const FAINT  = '#F4F6FB';
const MUTED  = '#6B7280';

function StatCard({ value, label, icon: Icon }: {
  value: string | number; label: string; icon: React.ElementType;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px',
      flex: 1, minWidth: '140px',
      border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '10px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        <Icon size={19} color="#fff" />
      </div>
      <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: MUTED, marginTop: '5px' }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { courses, loading, getProgress } = useCourses();

  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [progressLoading, setProgressLoading] = useState(true);

  const uid = user?.id ?? '';

  // Load progress for all published courses
  useEffect(() => {
    if (!uid || courses.length === 0) { setProgressLoading(false); return; }
    const published = courses.filter(c => c.published);
    setProgressLoading(true);
    Promise.all(
      published.map(c => getProgress(uid, c.id).then(p => ({ id: c.id, p })))
    ).then(results => {
      const map: Record<string, UserProgress> = {};
      results.forEach(({ id, p }) => { if (p) map[id] = p; });
      setProgressMap(map);
    }).catch(console.error).finally(() => setProgressLoading(false));
  }, [uid, courses]);

  const allProgress  = Object.values(progressMap);
  const active       = allProgress.filter(p => p.status === 'in_progress');
  const completed    = allProgress.filter(p => p.status === 'completed');

  const activeCourses = active.map(p => ({
    progress: p,
    course: courses.find(c => c.id === p.courseId),
  })).filter(x => !!x.course) as { progress: UserProgress; course: NonNullable<typeof courses[0]> }[];

  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12.5px', color: MUTED, textTransform: 'capitalize', marginBottom: '6px' }}>{today}</div>
          <h1 style={{ margin: 0, color: '#0F1629' }}>
            {t('dashboard.welcome')},{' '}
            <span style={{ color: BLUE }}>{user?.name.split(' ')[1] ?? user?.name}</span>
          </h1>
          <p style={{ color: MUTED, marginTop: '4px', fontSize: '13.5px' }}>
            {user?.position} · {user?.organization}
          </p>
        </div>
        <button
          onClick={() => navigate('/student/courses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '10px 18px', borderRadius: '9px',
            background: BLUE, border: 'none', color: '#fff',
            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(43,92,230,0.3)',
          }}
        >
          <IcBook size={15} color="#fff" />
          {t('nav.courses')}
          <IcChevronRight size={14} color="#fff" />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <StatCard value={active.length}    label="В процессе"     icon={IcBook}        />
        <StatCard value={completed.length} label="Завершено"      icon={IcCheckCircle} />
        <StatCard value={courses.filter(c => c.published).length} label="Доступных курсов" icon={IcMedal} />
        <StatCard value={allProgress.reduce((s, p) => s + (p.attempts?.length || 0), 0)} label="Попыток тестов" icon={IcClock} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

        {/* ── Active courses (left) ── */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F1629' }}>Активные курсы</h3>
              {active.length > 0 && (
                <span style={{ padding: '2px 9px', borderRadius: '20px', background: '#EBF1FE', color: BLUE, fontSize: '12px', fontWeight: 600 }}>
                  {active.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/student/courses')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: '4px 0' }}
            >
              Все курсы <IcArrowRight size={14} color={BLUE} />
            </button>
          </div>

          {(loading || progressLoading) ? (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', border: `1px solid ${BORDER}` }}>
              <p style={{ margin: 0, color: '#9CA3AF' }}>Загрузка курсов...</p>
            </div>
          ) : activeCourses.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '48px 24px',
              textAlign: 'center', border: `1px solid ${BORDER}`,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IcBook size={22} color="#fff" />
              </div>
              <p style={{ color: '#9CA3AF', margin: '0 0 14px', fontSize: '13.5px' }}>Нет активных курсов</p>
              <button
                onClick={() => navigate('/student/courses')}
                style={{ padding: '8px 18px', borderRadius: 8, background: BLUE, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Начать обучение
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeCourses.map(({ course, progress: p }) => {
                const pct = course.lessons.length > 0
                  ? Math.round((p.completedLessons.length / course.lessons.length) * 100)
                  : 0;
                return (
                  <div
                    key={course.id}
                    style={{
                      background: '#fff', borderRadius: '12px', padding: '18px 20px',
                      border: `1px solid ${BORDER}`, borderLeft: `3px solid ${BLUE}`,
                      cursor: 'pointer', transition: 'box-shadow 0.15s',
                    }}
                    onClick={() => navigate(`/student/courses/${course.id}`)}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 3px', color: '#0F1629', fontSize: '14px', lineHeight: 1.35, fontWeight: 600 }}>{course.title}</h4>
                        <span style={{ fontSize: '12px', color: MUTED }}>
                          {p.completedLessons.length} из {course.lessons.length} уроков
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/student/courses/${course.id}`); }}
                        style={{ width: 34, height: 34, borderRadius: '50%', background: NAVY, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <IcPlay size={13} color="#fff" />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '4px', background: FAINT, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: BLUE, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: BLUE, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Progress summary */}
          <div style={{ background: NAVY, borderRadius: '12px', padding: '18px 20px', color: '#fff', marginTop: '54px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IcTrendingUp size={16} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Общий прогресс</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>
                {completed.length}/{allProgress.length}
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%',
                width: `${allProgress.length > 0 ? Math.round((completed.length / Math.max(allProgress.length, 1)) * 100) : 0}%`,
                background: '#2B5CE6', borderRadius: '3px', transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.5 }}>Продолжайте обучение — вы на верном пути!</p>
          </div>

          {/* Completed courses */}
          <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F1629' }}>Завершённые курсы</h4>
                {completed.length > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#059669', fontSize: '11.5px', fontWeight: 600 }}>
                    {completed.length}
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {completed.length === 0 ? (
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#9CA3AF' }}>Ещё нет завершённых курсов</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {completed.slice(0, 5).map((p, idx) => {
                    const c = courses.find(c => c.id === p.courseId);
                    if (!c) return null;
                    const lastAttempt = p.attempts?.[p.attempts.length - 1];
                    return (
                      <div
                        key={p.courseId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 0',
                          borderBottom: idx < Math.min(completed.length, 5) - 1 ? `1px solid ${FAINT}` : 'none',
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IcCheckCircle size={14} color="#059669" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                          {lastAttempt && (
                            <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '1px' }}>Балл: {lastAttempt.score}%</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IcShield size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F1629' }}>Статус обучения</div>
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>✓ Обучение актуально</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}