import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import { IcSearch, IcCheckCircle, IcBook, IcChevronRight } from '../../components/Icons';

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

  const [search, setSearch]           = useState('');
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});

  useEffect(() => {
    if (!user || courses.length === 0) return;
    const published = courses.filter(c => c.published);
    Promise.all(
      published.map(c => getProgress(user.id, c.id).then(p => ({ id: c.id, p })))
    ).then(results => {
      const map: Record<string, UserProgress> = {};
      results.forEach(({ id, p }) => { map[id] = p; });
      setProgressMap(map);
    }).catch(console.error);
  }, [user, courses]);

  const published = courses.filter(c => c.published);
  const filtered  = published.filter(c =>
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
            {search ? `Ничего не найдено` : 'Курсов пока нет'}
          </p>
        </div>
      )}

      {/* Courses table */}
      {!loading && filtered.length > 0 && (
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