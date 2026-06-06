import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  IcCamera as Camera, IcCameraOff as CameraOff, IcWarning as AlertTriangle, IcTimer as Timer,
  IcChevronLeft as ChevronLeft, IcChevronRight as ChevronRight,
  IcCheckCircle as CheckCircle2, IcArrowRight as Send, IcWarning as AlertCircle,
  IcRocket, IcSettings,
} from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';
import { useViewport } from '../../lib/useViewport';

type CameraState = 'requesting' | 'granted' | 'denied';

export default function TestPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getCourse, saveAttempt } = useCourses();
  const { isMobile } = useViewport();

  const course = courseId ? getCourse(courseId) : undefined;

  // Enrollment guard — students can only take tests for assigned courses.
  const isAdmin = user?.role === 'admin';
  const isEnrolled = !!user && !!courseId && (user.enrolledCourses ?? []).includes(courseId);
  useEffect(() => {
    if (!course || !user) return;
    if (!isAdmin && !isEnrolled) navigate('/student/courses', { replace: true });
  }, [course, user, isAdmin, isEnrolled, navigate]);

  // Hidden offscreen <video> element — we still acquire the camera so the
  // "your session is being recorded" warning is true, but the student never
  // sees their own face during the test (asked for explicitly: visible self-
  // view was distracting).
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handleSubmitRef = useRef<(autoSubmit?: boolean) => Promise<void>>(async () => {});

  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState((course?.test.timeLimit || 20) * 60);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(Date.now());

  const questions = course?.test.questions || [];
  const totalTime = (course?.test.timeLimit || 20) * 60;

  useEffect(() => {
    if (!testStarted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmitRef.current(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testStarted]);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraState('granted');
    } catch { setCameraState('denied'); }
  };

  // Attach the camera stream to the hidden <video> element so the browser keeps
  // it active. The element itself is rendered with display:none below.
  useEffect(() => {
    if (!streamRef.current) return;
    if (videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // Keep ref in sync so the timer always calls the latest handleSubmit
  // (avoids stale closure capturing old `answers` state)
  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    const questions = course?.test.questions || [];
    let earned = 0, total = 0;
    questions.forEach(q => {
      total += q.points;
      const ans = answers[q.id];
      if (q.type === 'mcq') { if (ans === q.correctAnswer) earned += q.points; }
      else if (q.type === 'input_field') { if (String(ans).trim() === String(q.correctAnswer).trim()) earned += q.points; }
      else { if (ans !== undefined && ans !== '') earned += Math.round(q.points * 0.7); }
    });
    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = score >= (course?.test.passingScore || 70);
    const timeSpent = Math.round((Date.now() - startTime) / 60000);

    // Save to Supabase
    if (user && courseId) {
      try {
        await saveAttempt(user.id, courseId, {
          score,
          passed,
          startedAt: new Date(startTime).toISOString(),
          timeSpent,
          answers,
          autoSubmit,
        });
      } catch (e) {
        console.error('Failed to save test attempt:', e);
      }
    }

    navigate(`/student/results/${courseId}`, { state: { score, passed, answers, timeSpent, autoSubmit } });
  }, [answers, course, courseId, user, startTime, navigate, saveAttempt]);

  // Always keep the ref pointing to the latest handleSubmit
  handleSubmitRef.current = handleSubmit;

  useEffect(() => { return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Tests can now be hours long — show h:mm:ss past the hour, mm:ss otherwise.
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };
  // Human-readable test duration (minutes → hours) for the prep screen.
  const fmtTestDuration = (min: number) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h && m) return `${h} ч ${m} мин`;
    if (h) return `${h} ч`;
    return `${m} мин`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);
  const isLowTime = timeLeft < 300;
  const isCriticalTime = timeLeft < 60;

  if (!course) {
    return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Курс не найден</div>;
  }

  // A course with no test questions must not start (indexing questions[currentQ]
  // would throw and white-screen the exam). Show a friendly message instead.
  if (questions.length === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, backdropFilter: 'blur(8px)', padding: 20,
      }}>
        <div style={{ width: 440, maxWidth: '100%', borderRadius: 20, background: '#fff', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, #2B5CE6, #5B4EF0)' }} />
          <div style={{ padding: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0F1629' }}>В этом курсе пока нет вопросов</h2>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: '#6B7280', lineHeight: 1.55 }}>
              Тест ещё не настроен. Обратитесь к администратору или вернитесь к материалам курса.
            </p>
            <button onClick={() => navigate(`/student/courses/${courseId}`)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2B5CE6', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Вернуться к курсу
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Camera / pre-test screen ---- */
  if (!testStarted) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: 480, borderRadius: 20,
          background: '#fff', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, #2B5CE6, #5B4EF0)' }} />
          <div style={{ padding: 36 }}>

            {/* REQUESTING */}
            {cameraState === 'requesting' && (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: '#EBF1FE', border: '1px solid #BFDBFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Camera size={28} color="#2B5CE6" />
                </div>
                <h2 style={{ textAlign: 'center', margin: '0 0 12px', color: '#0F1629', fontSize: 20 }}>
                  {t('test.camera_required')}
                </h2>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
                  {t('test.camera_desc')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {[
                    { icon: Timer, text: `Время на тест: ${fmtTestDuration(course.test.timeLimit)}`, color: '#D97706', bg: '#FFFBEB' },
                    { icon: AlertCircle, text: `Вопросов: ${questions.length}`, color: '#2B5CE6', bg: '#EBF1FE' },
                    { icon: CheckCircle2, text: `Проходной балл: ${course.test.passingScore}%`, color: '#059669', bg: '#ECFDF5' },
                  ].map(({ icon: Icon, text, color, bg }) => (
                    <div key={text} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      background: bg, border: `1px solid ${color}25`,
                    }}>
                      <Icon size={15} color={color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{text}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={requestCamera}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(43,92,230,0.3)',
                  }}
                >
                  <Camera size={18} color="#fff" />
                  {t('test.camera_allow')}
                </button>
                <button
                  onClick={() => navigate(`/student/courses/${courseId}`)}
                  style={{
                    width: '100%', padding: 12, marginTop: 10,
                    borderRadius: 10, border: '1.5px solid #E3E7F0',
                    background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Отмена
                </button>
              </>
            )}

            {/* GRANTED — no self-view, just a confirmation. The stream is alive
                 in a hidden <video> rendered at the bottom of this component. */}
            {cameraState === 'granted' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: '#ECFDF5', border: '2px solid #A7F3D0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 18px', position: 'relative',
                }}>
                  <Camera size={32} color="#059669" />
                  {/* recording dot */}
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#DC2626',
                    boxShadow: '0 0 0 4px rgba(220,38,38,0.18)',
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }} />
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
                <h2 style={{ textAlign: 'center', margin: '0 0 8px', color: '#0F1629', fontSize: 18 }}>
                  Камера активна — запись ведётся
                </h2>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, margin: '0 0 6px', lineHeight: 1.55 }}>
                  Тест: <strong style={{ color: '#0F1629' }}>{course.title}</strong>
                </p>
                <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, margin: '0 0 24px', lineHeight: 1.55 }}>
                  Видеопревью не отображается, чтобы не отвлекать. Камера работает в фоне.
                </p>
                <button
                  onClick={() => setTestStarted(true)}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #059669, #10B981)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
                  }}
                >
                  <IcRocket size={16} color="#fff" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Начать тест
                </button>
              </>
            )}

            {/* DENIED */}
            {cameraState === 'denied' && (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <CameraOff size={28} color="#DC2626" />
                </div>
                <h2 style={{ textAlign: 'center', margin: '0 0 12px', color: '#0F1629', fontSize: 20 }}>{t('test.camera_denied')}</h2>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>{t('test.camera_denied_desc')}</p>
                <div style={{ padding: 16, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 20 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#DC2626', lineHeight: 1.5 }}>
                    <IcSettings size={14} color="#DC2626" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} /> Настройки браузера → Конфиденциальность → Камера → Разрешить для этого сайта
                  </p>
                </div>
                <button onClick={requestCamera} style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  Попробовать снова
                </button>
                <button onClick={() => navigate(`/student/courses/${courseId}`)} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid #E3E7F0', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 14 }}>
                  Вернуться к курсу
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- Active Test UI ---- */
  const q = questions[currentQ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 20,
      height: isMobile ? 'auto' : 'calc(100vh - 128px)',
    }}>
      {/* Sidebar: question map. Becomes a top strip on mobile. */}
      <div style={{
        width: isMobile ? '100%' : 220,
        minWidth: isMobile ? undefined : 220,
        background: '#fff', border: '1px solid #E3E7F0',
        borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #F0F3FA' }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>{t('test.navigation')}</div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
            {answeredCount} / {questions.length} {t('test.answered')}
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#F0F3FA', overflow: 'hidden', marginTop: 8 }}>
            <div style={{
              height: '100%', width: `${progressPct}%`, borderRadius: 3,
              background: 'linear-gradient(90deg, #2B5CE6, #059669)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        <div style={{
          flex: 1,
          padding: isMobile ? '10px 12px' : 12,
          overflowY: isMobile ? 'visible' : 'auto',
        }}>
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? undefined : 'repeat(4, 1fr)',
            gap: isMobile ? 6 : 6,
            overflowX: isMobile ? 'auto' : 'visible',
            scrollbarWidth: 'none' as const,
            paddingBottom: isMobile ? 2 : 0,
          }}>
            {questions.map((qItem, idx) => {
              const answered = answers[qItem.id] !== undefined && answers[qItem.id] !== '';
              const active = idx === currentQ;
              return (
                <button
                  key={qItem.id}
                  onClick={() => setCurrentQ(idx)}
                  style={{
                    width: isMobile ? 36 : undefined,
                    height: isMobile ? 36 : undefined,
                    aspectRatio: isMobile ? undefined : '1',
                    borderRadius: 8,
                    background: active ? '#2B5CE6' : answered ? '#ECFDF5' : '#F4F6FB',
                    color: active ? '#fff' : answered ? '#059669' : '#9CA3AF',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', flexShrink: 0,
                    border: active ? 'none' : answered ? '1px solid #A7F3D0' : '1px solid #E3E7F0',
                  }}
                >
                  {answered && !active ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recording indicator — no self-view, just a chip showing the camera
            is on. The hidden <video> tag keeps the stream alive (rendered at
            the bottom of this component, display:none). */}
        <div style={{ padding: 12, borderTop: '1px solid #F0F3FA' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FECACA',
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#DC2626',
              boxShadow: '0 0 0 3px rgba(220,38,38,0.18)',
              animation: 'pulse 1.4s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 1.35 }}>
              <div style={{ fontWeight: 700 }}>Запись ведётся</div>
              <div style={{ opacity: 0.85, marginTop: 1 }}>{t('test.camera_monitoring')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden video element — keeps the camera stream attached without
          showing the self-view. Rendered offscreen with display:none. */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

      {/* Center: Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {/* Timer bar */}
        <div style={{
          padding: isMobile ? '10px 14px' : '11px 20px', borderRadius: 12,
          background: '#fff',
          border: `1px solid ${isCriticalTime ? '#FECACA' : isLowTime ? '#FDE68A' : '#E3E7F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          gap: 10,
        }}>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '40%' : '60%' }}>
            {course.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: isMobile ? 60 : 100 }}>
              <div style={{ height: 5, borderRadius: 3, background: '#F0F3FA', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${(timeLeft / totalTime) * 100}%`,
                  background: isCriticalTime ? '#DC2626' : isLowTime ? '#D97706' : '#2B5CE6',
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: isCriticalTime ? '#FEF2F2' : isLowTime ? '#FFFBEB' : '#EBF1FE',
              border: `1px solid ${isCriticalTime ? '#FECACA' : isLowTime ? '#FDE68A' : '#BFDBFE'}`,
            }}>
              <Timer size={14} color={isCriticalTime ? '#DC2626' : isLowTime ? '#D97706' : '#2B5CE6'} />
              <span style={{
                fontSize: 15, fontWeight: 700, fontFamily: 'monospace',
                color: isCriticalTime ? '#DC2626' : isLowTime ? '#D97706' : '#2B5CE6',
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Question card */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px 14px' : '24px 28px',
          borderRadius: 14,
          background: '#fff', border: '1px solid #E3E7F0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>
                {t('test.question')} {currentQ + 1} {t('test.of')} {questions.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
                    mcq: { label: 'MCQ', color: '#2B5CE6', bg: '#EBF1FE' },
                    open_answer: { label: 'Открытый ответ', color: '#D97706', bg: '#FFFBEB' },
                    scale: { label: 'Шкала', color: '#7C3AED', bg: '#F5F3FF' },
                    input_field: { label: 'Ввод', color: '#059669', bg: '#ECFDF5' },
                  };
                  const meta = TYPE_META[q.type] ?? { label: q.type, color: '#6B7280', bg: '#F4F6FB' };
                  return (
                    <span style={{
                      padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      background: meta.bg, color: meta.color,
                    }}>{meta.label}</span>
                  );
                })()}
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{q.points} балл(ов)</span>
              </div>
            </div>
            <h3 style={{ margin: 0, color: '#0F1629', fontSize: 17, lineHeight: 1.5 }}>{q.text}</h3>
          </div>

          {/* Answer zone */}
          <div style={{ flex: 1 }}>
            {/* MCQ */}
            {q.type === 'mcq' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map((opt, i) => {
                  // opt can be QOption {id, text} or string (legacy)
                  const optText = typeof opt === 'object' ? (opt as any).text : opt;
                  const selected = answers[q.id] === optText;
                  return (
                    <button
                      key={typeof opt === 'object' ? (opt as any).id : i}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optText }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 18px', borderRadius: 10,
                        border: `2px solid ${selected ? '#2B5CE6' : '#E3E7F0'}`,
                        background: selected ? '#EBF1FE' : '#FAFBFF',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!selected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#BFDBFE';
                          (e.currentTarget as HTMLButtonElement).style.background = '#F4F8FF';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!selected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
                          (e.currentTarget as HTMLButtonElement).style.background = '#FAFBFF';
                        }
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${selected ? '#2B5CE6' : '#D1D5DB'}`,
                        background: selected ? '#2B5CE6' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{
                        minWidth: 22, fontSize: 14, fontWeight: 700,
                        color: selected ? '#1E40AF' : '#6B7280',
                      }}>
                        {i + 1}.
                      </span>
                      <span style={{ fontSize: 14, color: selected ? '#1E40AF' : '#374151', fontWeight: selected ? 500 : 400 }}>
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open Answer */}
            {q.type === 'open_answer' && (
              <div>
                <label style={{ display: 'block', marginBottom: 10, color: '#6B7280', fontSize: 13 }}>
                  {t('test.your_answer')}
                </label>
                <textarea
                  value={String(answers[q.id] || '')}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={t('test.type_answer')}
                  rows={6}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10,
                    border: '1.5px solid #E3E7F0', background: '#F8FAFD',
                    color: '#0F1629', fontSize: 14, lineHeight: 1.6,
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2B5CE6'; }}
                  onBlur={e => { e.target.style.borderColor = '#E3E7F0'; }}
                />
              </div>
            )}

            {/* Input field */}
            {q.type === 'input_field' && (
              <div>
                <label style={{ display: 'block', marginBottom: 10, color: '#6B7280', fontSize: 13 }}>
                  {t('test.your_answer')}
                </label>
                <input
                  type="text"
                  value={String(answers[q.id] || '')}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Введите ответ..."
                  style={{
                    width: '100%', padding: 14, borderRadius: 10,
                    border: '1.5px solid #E3E7F0', background: '#F8FAFD',
                    color: '#0F1629', fontSize: 15,
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2B5CE6'; }}
                  onBlur={e => { e.target.style.borderColor = '#E3E7F0'; }}
                />
              </div>
            )}

            {/* Scale */}
            {q.type === 'scale' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{q.scaleLabels?.min}</span>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{q.scaleLabels?.max}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {Array.from({ length: (q.maxScale || 10) - (q.minScale || 1) + 1 }, (_, i) => i + (q.minScale || 1)).map(val => {
                    const selected = answers[q.id] === val;
                    const pct2 = (val - (q.minScale || 1)) / ((q.maxScale || 10) - (q.minScale || 1));
                    const scaleColor = pct2 < 0.4 ? '#059669' : pct2 < 0.7 ? '#D97706' : '#DC2626';
                    return (
                      <button
                        key={val}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                        style={{
                          width: 48, height: 48, borderRadius: 10,
                          border: `2px solid ${selected ? scaleColor : '#E3E7F0'}`,
                          background: selected ? `${scaleColor}15` : '#F8FAFD',
                          color: selected ? scaleColor : '#6B7280',
                          cursor: 'pointer', fontSize: 16, fontWeight: 700,
                          transition: 'all 0.15s',
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
                {answers[q.id] !== undefined && (
                  <div style={{ textAlign: 'center', marginTop: 14, fontSize: 14, color: '#6B7280' }}>
                    Ваша оценка: <strong style={{ color: '#0F1629' }}>{answers[q.id]}</strong> из {q.maxScale}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: '1px solid #F0F3FA' }}>
            <button
              onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
              disabled={currentQ === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 8,
                border: '1.5px solid #E3E7F0', background: '#F8FAFD',
                color: currentQ === 0 ? '#D1D5DB' : '#374151',
                cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontSize: 14,
              }}
            >
              <ChevronLeft size={16} color="currentColor" /> {t('test.prev')}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 8,
                    border: 'none', background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: '0 2px 10px rgba(43,92,230,0.25)',
                  }}
                >
                  {t('test.next')} <ChevronRight size={16} color="#fff" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 8,
                    border: 'none', background: 'linear-gradient(135deg, #059669, #10B981)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
                  }}
                >
                  <Send size={15} color="#fff" /> {t('test.submit')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 400,
            padding: isMobile ? 22 : 32,
            margin: isMobile ? '0 16px' : 0,
            borderRadius: 16,
            background: '#fff', border: '1px solid #E3E7F0',
            boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={22} color="#D97706" />
              <h3 style={{ margin: 0, color: '#0F1629' }}>{t('test.submit')}</h3>
            </div>
            <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>
              {t('test.confirm_submit')}
            </p>
            {answeredCount < questions.length && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#D97706' }}>
                  ⚠️ {t('test.unanswered')}: {questions.length - answeredCount} из {questions.length}
                </p>
              </div>
            )}
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#9CA3AF' }}>
              Оставшееся время: {formatTime(timeLeft)}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  flex: 1, padding: 11, borderRadius: 8,
                  border: '1.5px solid #E3E7F0', background: 'transparent',
                  color: '#374151', cursor: 'pointer', fontSize: 14,
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleSubmit()}
                style={{
                  flex: 1, padding: 11, borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10B981)',
                  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                {t('test.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}