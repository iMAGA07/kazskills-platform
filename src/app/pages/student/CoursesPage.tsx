import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import { IcSearch, IcCheckCircle, IcBook, IcChevronRight } from '../../components/Icons';
import { useViewport } from '../../lib/useViewport';
import { InstructionModal, WhatsAppGlyph } from '../../components/shared/InstructionModal';
import { whatsappLink, SUPPORT_PREFILL, SUPPORT_WHATSAPP_DISPLAY } from '../../lib/platformInfo';

const NAVY   = '#1B3D84';
const BLUE   = '#2B5CE6';
const BORDER = '#E8ECF6';
const FAINT  = '#F4F6FB';

// Russian flag icon component
const RussianFlag = () => (
  <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
    <rect width="20" height="5" fill="#fff"/>
    <rect y="5" width="20" height="5" fill="#0039A6"/>
    <rect y="10" width="20" height="5" fill="#D52B1E"/>
  </svg>
);

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courses, loading, getProgress } = useCourses();
  const { isMobile } = useViewport();

  const [search, setSearch]           = useState('');
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [showInstr, setShowInstr]     = useState(false);

  // Student sees only the courses the admin enrolled them in.
  const enrolledIds = new Set(user?.enrolledCourses ?? []);
  const visible = courses.filter(c => c.published && enrolledIds.has(c.id));

  useEffect(() => {
    if (!user || visible.length === 0) return;
    Promise.all(
      visible.map(c => getProgress(user.id, c.id).then(p => ({ id: c.id, p })))
    ).then(results => {
      const map: Record<string, UserProgress> = {};
      results.forEach(({ id, p }) => { map[id] = p; });
      setProgressMap(map);
    }).catch(console.error);
  }, [user, courses]);

  const filtered = visible.filter(c =>
    search === '' || c.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (courseId: string) => progressMap[courseId]?.status ?? 'not_started';

  const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    not_started: { label: 'Не начат',   color: '#EF4444', bg: '#FEE2E2' },
    in_progress: { label: 'В процессе', color: BLUE,      bg: '#EBF1FE' },
    completed:   { label: 'Зачтён',     color: '#059669', bg: '#D1FAE5' },
  };

  // Mock expiry dates (replace with actual data)
  const getExpiryDate = (courseId: string) => {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Welcome banner + support block */}
      {user && (
        <div style={{
          marginBottom: '20px', padding: '18px 22px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #EBF1FE 0%, #F4F7FF 100%)',
          border: `1px solid #D6E0FF`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: '11.5px', fontWeight: 700, color: BLUE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Добро пожаловать
              </p>
              <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: NAVY, lineHeight: 1.2, wordBreak: 'break-word' }}>
                {user.name}!
              </h2>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#4B5563' }}>
                Ниже представлен список назначенных вам курсов.
              </p>
            </div>
            <button
              onClick={() => setShowInstr(true)}
              style={{
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 15px', borderRadius: 999,
                background: '#fff', border: '1.5px solid #BFDBFE',
                color: NAVY, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              📘 Краткая инструкция
            </button>
          </div>

          {/* Support block (moved here from the instruction modal) */}
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px dashed #C7D6FF',
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#065F46', marginBottom: 5 }}>
              Служба поддержки
            </div>
            <div style={{ fontSize: 12.5, color: '#15803D', lineHeight: 1.5, marginBottom: 10 }}>
              Если возникнут вопросы или технические сложности — напишите нам в WhatsApp.
              В сообщении укажите ваше ФИО, организацию и должность, а также описание проблемы.
            </div>
            <a
              href={whatsappLink(SUPPORT_PREFILL)}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 9, background: '#25D366',
                color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}
            >
              <WhatsAppGlyph size={16} color="#fff" />
              Написать в WhatsApp · {SUPPORT_WHATSAPP_DISPLAY}
            </a>
          </div>
        </div>
      )}

      <InstructionModal open={showInstr} onClose={() => setShowInstr(false)} />

      {/* Simple header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#0F1629' }}>
          МОИ КУРСЫ
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
          Список доступных для вас курсов
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: '28px', marginBottom: 10 }}>⟳</div>
          <p style={{ margin: 0 }}>Загрузка...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
          <IcBook size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>
            {search
              ? 'Ничего не найдено'
              : enrolledIds.size === 0
                ? 'Вам пока не назначили ни одного курса. Обратитесь к администратору.'
                : 'Назначенные курсы пока не опубликованы.'}
          </p>
        </div>
      )}

      {/* Courses — list of cards on mobile */}
      {!loading && filtered.length > 0 && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(course => {
            const status = getStatus(course.id);
            const st = statusLabel[status] ?? statusLabel['not_started'];
            const expiryDate = getExpiryDate(course.id);
            return (
              <div
                key={course.id}
                onClick={() => navigate(`/student/courses/${course.id}`)}
                style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid #E3E7F0', padding: '14px 14px',
                  cursor: 'pointer', display: 'flex', gap: 12,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#EBF1FE', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IcBook size={18} color="#2B5CE6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2B5CE6', lineHeight: 1.35, marginBottom: 6 }}>
                    {course.title}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 600,
                      color: st.color, background: st.bg,
                      padding: '3px 9px', borderRadius: 12,
                    }}>{st.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RussianFlag />
                    </span>
                    <span style={{ fontSize: 11.5, color: '#6B7280' }}>до {expiryDate}</span>
                  </div>
                </div>
                <IcChevronRight size={16} color="#9CA3AF" style={{ alignSelf: 'center', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Courses table (desktop / tablet) */}
      {!loading && filtered.length > 0 && !isMobile && (
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #E3E7F0', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: FAINT, borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                  Название
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '100px', textTransform: 'uppercase' }}>
                  Язык
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '120px', textTransform: 'uppercase' }}>
                  Истекает
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '120px', textTransform: 'uppercase' }}>
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course, idx) => {
                const status = getStatus(course.id);
                const st = statusLabel[status] ?? statusLabel['not_started'];
                const expiryDate = getExpiryDate(course.id);

                return (
                  <tr
                    key={course.id}
                    onClick={() => navigate(`/student/courses/${course.id}`)}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = FAINT}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fff'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#2B5CE6' }}>
                        {course.title}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <RussianFlag />
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                      {expiryDate}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '12px', fontWeight: 600,
                        color: st.color, background: st.bg,
                        padding: '5px 12px', borderRadius: '16px',
                      }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}