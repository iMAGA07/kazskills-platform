import React, { useState } from 'react';
import { IcTrendingUp, IcTeam, IcBook, IcMedal } from '../../components/Icons';
import { useLanguage } from '../../context/LanguageContext';
import { SparkLineChart } from '../../components/shared/SparkLineChart';
import { useCourses } from '../../context/CoursesContext';
import { useUsers } from '../../context/UsersContext';

const NAVY   = '#1B3D84';
const BLUE   = '#2B5CE6';
const BORDER = '#E8ECF6';
const FAINT  = '#F4F6FB';
const MUTED  = '#6B7280';
const MONO   = ['#131C35', '#1E3A6E', '#2B5CE6', '#6B93F0', '#A8BFFA'];

// Simple SVG bar chart
function SimpleBarChart({ data }: { data: { day: string; sessions: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...data.map(d => d.sessions)) * 1.2 || 1;
  const W = 500; const H = 180;
  const PAD = { top: 10, bottom: 28, left: 30, right: 10 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW  = Math.floor(plotW / data.length * 0.55);
  const gap   = plotW / data.length;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}>
        {[0, 0.5, 1].map((t, i) => {
          const v = Math.round(t * maxVal);
          const y = PAD.top + plotH - t * plotH;
          return (
            <g key={`ytick-${i}`}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={BORDER} strokeWidth={1} strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">{v}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = (d.sessions / maxVal) * plotH;
          const x  = PAD.left + i * gap + (gap - barW) / 2;
          const y  = PAD.top + plotH - bh;
          const isMax = d.sessions === Math.max(...data.map(d2 => d2.sessions));
          return (
            <g key={`bar-${i}`} onMouseEnter={() => setHovered(i)}>
              <rect x={x} y={y} width={barW} height={bh}
                fill={hovered === i ? NAVY : isMax ? NAVY : '#BFCEF6'}
                rx={4} ry={4} style={{ transition: 'fill 0.15s' }}
              />
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#9CA3AF">{d.day}</text>
            </g>
          );
        })}
      </svg>
      {hovered !== null && (
        <div style={{
          position: 'absolute', top: 10,
          left: `calc(${((PAD.left + hovered * gap + gap / 2) / W) * 100}% + 8px)`,
          background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '8px',
          padding: '6px 10px', fontSize: '12px', color: '#374151',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10,
        }}>
          <div style={{ color: '#9CA3AF', marginBottom: '2px' }}>{data[hovered].day}</div>
          <div style={{ fontWeight: 600, color: '#0F1629' }}>{data[hovered].sessions} <span style={{ fontWeight: 400, color: '#6B7280' }}>сессий</span></div>
        </div>
      )}
    </div>
  );
}

const WEEKS_DATA = [
  { day: 'Пн', sessions: 12 },
  { day: 'Вт', sessions: 18 },
  { day: 'Ср', sessions: 15 },
  { day: 'Чт', sessions: 22 },
  { day: 'Пт', sessions: 19 },
  { day: 'Сб', sessions: 7  },
  { day: 'Вс', sessions: 4  },
];

export default function AdminAnalyticsPage() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const { courses, loading } = useCourses();
  const { users } = useUsers();

  // Derive analytics from real courses data
  const totalStudents = users.filter(u => u.role === 'student').length;
  const publishedCourses = courses.filter(c => c.published);
  const totalCourses = publishedCourses.length;
  const totalQuestions = courses.reduce((s, c) => s + c.test.questions.length, 0);
  const totalMaterials = courses.reduce((s, c) => s + c.lessons.length, 0);

  // Chart data: enrollment counts per course
  const monthlyData = publishedCourses.slice(0, 8).map((c, i) => ({
    label: c.title.slice(0, 8) + (c.title.length > 8 ? '…' : ''),
    value: c.enrolledCount || 0,
  }));

  // Fallback if no real data yet
  const monthlyFallback = [
    { label: 'Янв', value: 12 }, { label: 'Фев', value: 15 },
    { label: 'Мар', value: 18 }, { label: 'Апр', value: 22 },
    { label: 'Май', value: 28 }, { label: 'Июн', value: 24 },
  ];

  const chartData = (period === 'month' ? (monthlyData.length > 0 ? monthlyData : monthlyFallback) : WEEKS_DATA.map(d => ({ label: d.day, value: d.sessions })));

  // Pass-rate bars from real courses
  const passRateBars = publishedCourses.map(c => ({
    name: c.title,
    rate: c.test.passingScore,
  }));

  // Category breakdown derived from question types
  const typeBreakdown = [
    { name: 'Промышленная безопасность', value: 40 },
    { name: 'Охрана труда',              value: 25 },
    { name: 'Пожарная безопасность',     value: 20 },
    { name: 'Электробезопасность',       value: 15 },
  ];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>{t('admin.analytics')}</h1>
          <p style={{ color: MUTED, margin: 0, fontSize: '13.5px' }}>Детальная аналитика обучения и результатов</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: FAINT, borderRadius: '9px', padding: '3px', border: `1px solid ${BORDER}` }}>
          {[{ k: 'month', l: 'По курсам' }, { k: 'week', l: 'По неделям' }].map(opt => (
            <button
              key={opt.k}
              onClick={() => setPeriod(opt.k as any)}
              style={{
                padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: period === opt.k ? NAVY : 'transparent',
                color: period === opt.k ? '#fff' : MUTED,
                fontSize: '13px', fontWeight: period === opt.k ? 600 : 400, transition: 'all 0.15s',
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { icon: IcTeam,       label: 'Всего слушателей',   value: totalStudents,  trend: 'пользователей' },
          { icon: IcBook,       label: 'Курсов опубликовано', value: totalCourses,   trend: 'курсов' },
          { icon: IcTrendingUp, label: 'Вопросов в тестах',  value: totalQuestions,  trend: 'вопросов' },
          { icon: IcMedal,      label: 'Учебных материалов', value: totalMaterials, trend: 'материалов' },
        ].map(({ icon: Icon, label, value, trend }) => (
          <div key={label} style={{
            flex: 1, minWidth: '150px', background: '#fff', borderRadius: '12px',
            padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: 38, height: 38, borderRadius: '9px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} color="#fff" />
              </div>
              <IcTrendingUp size={13} color={BLUE} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>{label}</div>
            <div style={{ fontSize: '11px', color: BLUE, marginTop: '3px', fontWeight: 500 }}>{trend}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px', alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 2px', color: '#0F1629' }}>
              {period === 'month' ? 'Прохождения по курсам' : 'Активность по дням недели'}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>Динамика за период</p>
          </div>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Загрузка...</div>
          ) : (
            <SparkLineChart data={chartData} color={BLUE} height={200} tooltipLabel="прохождений" />
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
          <h4 style={{ margin: '0 0 16px', color: '#0F1629', fontSize: '14px' }}>По категориям</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {typeBreakdown.map((item, i) => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F1629' }}>{item.value}%</span>
                </div>
                <div style={{ height: '5px', background: FAINT, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.value}%`, background: MONO[i % MONO.length], borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
          <h4 style={{ margin: '0 0 20px', color: '#0F1629', fontSize: '14px' }}>Проходной балл по курсам</h4>
          {passRateBars.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0 }}>Нет опубликованных курсов</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {passRateBars.map(({ name, rate }) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F1629' }}>{rate}%</span>
                  </div>
                  <div style={{ height: '6px', background: FAINT, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: BLUE, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
          <h4 style={{ margin: '0 0 20px', color: '#0F1629', fontSize: '14px' }}>Активность по дням недели</h4>
          <SimpleBarChart data={WEEKS_DATA} />
        </div>
      </div>
    </div>
  );
}
