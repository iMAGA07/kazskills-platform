import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getCourse, getProgress, loading } = useCourses();

  const [progress, setProgress]               = useState<UserProgress | null>(null);
  const [showTestModal, setShowTestModal]      = useState(false);
  const [showAllAttempts, setShowAllAttempts]  = useState(false);
  const [activeTab, setActiveTab] = useState<'presentation' | 'testing'>('presentation');

  const course = id ? getCourse(id) : undefined;

  useEffect(() => {
    if (!user || !id) return;
    getProgress(user.id, id).then(setProgress).catch(console.error);
  }, [user, id]);

  if (loading && !course) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>Загрузка...</div>;
  }

  if (!course) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#6B7280' }}>Курс не найден</p>
        <button onClick={() => navigate('/student/courses')}
          style={{ color: '#2B5CE6', background: 'none', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
          ← Вернуться к курсам
        </button>
      </div>
    );
  }

  const attempts = progress?.attempts ?? [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '13px' }}>
        <button
          onClick={() => navigate('/student/courses')}
          style={{ background: 'none', border: 'none', color: '#2B5CE6', cursor: 'pointer', padding: 0, fontSize: '13px' }}
        >
          Мои курсы
        </button>
        <span style={{ color: '#9CA3AF' }}>/</span>
        <span style={{ color: '#6B7280' }}>{course.title}</span>
      </div>

      {/* Course title with back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F1629', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {course.title}
        </h1>
        <button
          onClick={() => navigate('/student/courses')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(43,92,230,0.25)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <span>↻</span>
          <span>ВЕРНУТЬСЯ НАЗАД</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #E3E7F0' }}>
        <button
          onClick={() => setActiveTab('presentation')}
          style={{
            padding: '12px 32px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'presentation' ? '3px solid #2B5CE6' : '3px solid transparent',
            color: activeTab === 'presentation' ? '#2B5CE6' : '#6B7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '-2px',
            transition: 'all 0.15s',
          }}
        >
          ПРЕЗЕНТАЦИЯ
        </button>
        <button
          onClick={() => setActiveTab('testing')}
          style={{
            padding: '12px 32px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'testing' ? '3px solid #2B5CE6' : '3px solid transparent',
            color: activeTab === 'testing' ? '#2B5CE6' : '#6B7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '-2px',
            transition: 'all 0.15s',
          }}
        >
          ТЕСТИРОВАНИЕ
        </button>
      </div>

      {/* Content */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E3E7F0',
        padding: '32px',
        minHeight: '400px',
      }}>
        {activeTab === 'presentation' && (
          <div>
            <h2 style={{
              margin: '0 0 20px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#0F1629',
              textTransform: 'uppercase',
            }}>
              МАТЕРИАЛЫ КУРСА
            </h2>

            {course.lessons.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF' }}>
                Материалов нет
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {course.lessons.map((lesson, idx) => (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/student/learn/${id}/${lesson.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: '1px solid #E3E7F0',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B5CE6';
                      (e.currentTarget as HTMLButtonElement).style.background = '#EBF1FE';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
                      (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#EBF1FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#2B5CE6',
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F1629' }}>
                        {lesson.title}
                      </span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="#2B5CE6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'testing' && (
          <div>
            <h2 style={{
              margin: '0 0 20px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#0F1629',
              textTransform: 'uppercase',
            }}>
              ЭКЗАМЕН
            </h2>

            <button
              onClick={() => setShowTestModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '16px 20px',
                borderRadius: '8px',
                border: '1px solid #E3E7F0',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                marginBottom: '24px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B5CE6';
                (e.currentTarget as HTMLButtonElement).style.background = '#EBF1FE';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
                (e.currentTarget as HTMLButtonElement).style.background = '#fff';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#EBF1FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  📝
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F1629' }}>
                  Экзаменационные вопросы курса
                </span>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#2B5CE6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Attempts */}
            {attempts.length > 0 && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #E3E7F0',
                }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F1629' }}>
                    Попытки прохождения
                  </h3>
                  <button
                    onClick={() => setShowAllAttempts(v => !v)}
                    style={{
                      background: 'none', 
                      border: 'none', 
                      color: '#2B5CE6',
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      padding: 0,
                      textDecoration: 'underline',
                      fontWeight: 500,
                    }}
                  >
                    {showAllAttempts ? 'Скрыть все' : 'Показать все'}
                  </button>
                </div>
                {showAllAttempts && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...attempts].reverse().map((attempt, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: attempt.passed ? '#D1FAE5' : '#FEE2E2',
                        border: `1px solid ${attempt.passed ? '#059669' : '#EF4444'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: 600,
                            color: '#6B7280',
                          }}>
                            Попытка {attempts.length - idx}:
                          </span>
                          <span style={{ 
                            fontSize: '16px', 
                            fontWeight: 700, 
                            color: attempt.passed ? '#059669' : '#EF4444',
                          }}>
                            {attempt.score}%
                          </span>
                        </div>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          background: attempt.passed ? '#059669' : '#EF4444',
                          color: '#fff',
                        }}>
                          {attempt.passed ? 'Зачёт' : 'Незачёт'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Modal */}
      {showTestModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowTestModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '12px', padding: '28px',
              width: '480px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', color: '#0F1629', fontSize: '20px', fontWeight: 700 }}>
              Параметры теста
            </h3>
            <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: '14px' }}>
              Экзаменационные вопросы курса
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Количество вопросов',  value: course.test.questions.length },
                { label: 'Время на прохождение', value: `${course.test.timeLimit} мин` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: '14px', borderRadius: '8px',
                  background: '#F4F6FB', border: '1px solid #E3E7F0',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1B3D84' }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Warning */}
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: '8px', padding: '14px', marginBottom: '20px',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#92400E' }}>ВАЖНО!</p>
              <div style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 8px' }}>
                  После нажатия кнопки «НАЧАТЬ» запустится таймер. Успейте пройти тест за отведённое время.
                </p>
                <p style={{ margin: 0 }}>
                  Во время прохождения будет вестись запись с веб-камеры.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowTestModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid #E3E7F0', background: '#fff',
                  color: '#6B7280', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => { setShowTestModal(false); navigate(`/student/test/${id}`); }}
                style={{
                  flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
                  background: '#2B5CE6',
                  color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                }}
              >
                НАЧАТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}