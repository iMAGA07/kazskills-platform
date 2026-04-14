import React from 'react';
import { useNavigate } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';
import { useUsers } from '../../context/UsersContext';
import { SparkLineChart } from '../../components/shared/SparkLineChart';
import {
  IcTeam, IcBook, IcMedal, IcPlus, IcArrowRight,
  IcEye, IcGraph, IcChevronRight,
} from '../../components/Icons';

const NAVY   = '#1B3D84';
const BLUE   = '#2B5CE6';
const CARD   = '#fff';
const BORDER = '#E8ECF6';
const MUTED  = '#6B7280';
const FAINT  = '#F4F6FB';

function KpiCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: string;
}) {
  return (
    <div style={{
      background: CARD, borderRadius: '12px', padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: '150px',
      border: `1px solid ${BORDER}`,
      display: 'flex', gap: '14px', alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '10px',
        background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color="#fff" />
      </div>
      <div>
        <div style={{ fontSize: '27px', fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>{label}</div>
        {trend && <div style={{ fontSize: '11px', color: BLUE, marginTop: '3px', fontWeight: 500 }}>↑ {trend}</div>}
        {sub   && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { users } = useUsers();
  const { courses, loading } = useCourses();

  const totalStudents  = users.filter(u => u.role === 'student').length;
  const publishedCourses = courses.filter(c => c.published);
  const totalCourses   = publishedCourses.length;
  const totalQuestions = courses.reduce((s, c) => s + c.test.questions.length, 0);
  const totalMaterials = courses.reduce((s, c) => s + c.lessons.length, 0);
  const recentCourses  = courses.slice(0, 5);

  // Chart data – enrolledCount per course
  const chartData = courses.slice(0, 8).map(c => ({
    label: c.title.slice(0, 10) + (c.title.length > 10 ? '…' : ''),
    value: c.enrolledCount || 0,
  }));

  // Pass-rate bars from courses
  const passRateBars = publishedCourses.slice(0, 5).map(c => ({
    name: c.title,
    rate: c.test.passingScore,
  }));

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>Панель администратора</h1>
          <p style={{ color: MUTED, margin: 0, fontSize: '13.5px' }}>
            Обзор платформы · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/courses/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '10px 18px', borderRadius: '9px',
            background: BLUE, border: 'none', color: '#fff',
            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(43,92,230,0.3)',
          }}
        >
          <IcPlus size={15} color="#fff" />
          {t('admin.create_course')}
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <KpiCard label="Слушателей"     value={totalStudents}  icon={IcTeam}  trend="+2 за месяц" />
        <KpiCard label="Курсов"         value={totalCourses}   icon={IcBook}  sub="Опубликовано" />
        <KpiCard label="Материалов"     value={totalMaterials} icon={IcMedal} />
        <KpiCard label="Вопросов в тестах" value={totalQuestions} icon={IcGraph} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Chart */}
        <div style={{ background: CARD, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 2px', color: '#0F1629' }}>Прохождения по курсам</h3>
              <p style={{ color: MUTED, margin: 0, fontSize: '12.5px' }}>Количество прохождений теста</p>
            </div>
            <div style={{
              padding: '5px 12px', borderRadius: '6px',
              background: FAINT, border: `1px solid ${BORDER}`,
              fontSize: '12px', fontWeight: 600, color: BLUE,
            }}>Актуально</div>
          </div>
          {chartData.length > 0 ? (
            <SparkLineChart data={chartData} color={BLUE} height={200} tooltipLabel="прохождений" />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              {loading ? 'Загрузка...' : 'Данных пока нет. Создайте первый курс.'}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pass rates */}
          <div style={{ background: CARD, borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
            <h4 style={{ margin: '0 0 16px', color: '#0F1629', fontSize: '14px' }}>Проходной балл по курсам</h4>
            {passRateBars.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>Нет опубликованных курсов</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {passRateBars.map(({ name, rate }) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F1629' }}>{rate}%</span>
                    </div>
                    <div style={{ height: '5px', background: FAINT, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${rate}%`, background: BLUE, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ background: CARD, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
            <h4 style={{ margin: '0 0 14px', color: '#0F1629', fontSize: '14px' }}>Быстрые действия</h4>
            {[
              { label: 'Создать курс',              path: '/admin/courses/new', icon: IcPlus  },
              { label: 'Управление пользователями', path: '/admin/users',       icon: IcTeam  },
              { label: 'Аналитика',                 path: '/admin/analytics',   icon: IcGraph },
            ].map(({ label, path, icon: Icon }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 0', background: 'none', border: 'none',
                  borderBottom: `1px solid ${FAINT}`, cursor: 'pointer',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.paddingLeft = '6px'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.paddingLeft = '0'}
              >
                <div style={{ width: 30, height: 30, borderRadius: '7px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color="#fff" />
                </div>
                <span style={{ flex: 1, fontSize: '13px', color: '#374151', fontWeight: 500 }}>{label}</span>
                <IcChevronRight size={14} color="#D1D5DB" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent courses table */}
      <div style={{ background: CARD, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: '20px', border: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, color: '#0F1629' }}>Все курсы</h3>
          <button
            onClick={() => navigate('/admin/courses')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            Управление <IcArrowRight size={14} color={BLUE} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading && <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Загрузка...</p>}
          {!loading && recentCourses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF' }}>
              <IcBook size={36} color="#D1D5DB" style={{ marginBottom: 10 }} />
              <p style={{ margin: '0 0 12px' }}>Курсов пока нет</p>
              <button
                onClick={() => navigate('/admin/courses/new')}
                style={{ padding: '8px 18px', borderRadius: 8, background: BLUE, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Создать первый курс
              </button>
            </div>
          )}
          {!loading && recentCourses.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 0',
              borderBottom: i < recentCourses.length - 1 ? `1px solid ${FAINT}` : 'none',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '9px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IcBook size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#0F1629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px' }}>
                  {c.lessons.length} материалов · {c.test.questions.length} вопросов
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  fontSize: '11.5px', fontWeight: 600,
                  color: c.published ? '#059669' : '#9CA3AF',
                  background: c.published ? '#D1FAE5' : FAINT,
                  padding: '3px 8px', borderRadius: '5px',
                }}>
                  {c.published ? 'Опубликован' : 'Черновик'}
                </span>
              </div>
              <button
                onClick={() => navigate(`/admin/courses/${c.id}/edit`)}
                style={{
                  width: 32, height: 32, borderRadius: '7px',
                  background: FAINT, border: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = NAVY; (e.currentTarget as HTMLButtonElement).style.borderColor = NAVY; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = FAINT; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
              >
                <IcEye size={14} color="#6B7280" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
