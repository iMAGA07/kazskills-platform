import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  IcCamera as Camera, IcCameraOff as CameraOff, IcWarning as AlertTriangle, IcTimer as Timer,
  IcChevronLeft as ChevronLeft, IcChevronRight as ChevronRight,
  IcCheckCircle as CheckCircle2, IcArrowRight as Send, IcYoutube as Video, IcWarning as AlertCircle,
  IcRocket, IcSettings,
} from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';

type CameraState = 'requesting' | 'granted' | 'denied';

export default function TestPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getCourse, saveAttempt } = useCourses();

  const course = courseId ? getCourse(courseId) : undefined;
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
      // srcObject is assigned after the video element mounts (see useEffect below)
    } catch { setCameraState('denied'); }
  };

  // Attach the camera stream to the <video> element every time cameraState
  // changes to 'granted' or when testStarted flips (the video re-mounts).
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
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);
  const isLowTime = timeLeft < 300;
  const isCriticalTime = timeLeft < 60;

  if (!course) {
    return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Курс не найден</div>;
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
                    { icon: Timer, text: `Время на тест: ${course.test.timeLimit} минут`, color: '#D97706', bg: '#FFFBEB' },
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

            {/* GRANTED */}
            {cameraState === 'granted' && (
              <>
                <div style={{
                  width: '100%', aspectRatio: '16/9', borderRadius: 12,
                  background: '#000', overflow: 'hidden', marginBottom: 20,
                  border: '2px solid #A7F3D0', position: 'relative',
                }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', bottom: 10, left: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20,
                    background: 'rgba(0,0,0,0.7)',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>{t('test.camera_monitoring')}</span>
                  </div>
                </div>
                <h2 style={{ textAlign: 'center', margin: '0 0 8px', color: '#0F1629', fontSize: 18 }}>Камера активна. Готовы начать?</h2>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, margin: '0 0 24px' }}>
                  Тест: <strong style={{ color: '#0F1629' }}>{course.title}</strong>
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
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 128px)' }}>
      {/* Left sidebar: question map */}
      <div style={{
        width: 220, minWidth: 220,
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

        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {questions.map((qItem, idx) => {
              const answered = answers[qItem.id] !== undefined && answers[qItem.id] !== '';
              const active = idx === currentQ;
              return (
                <button
                  key={qItem.id}
                  onClick={() => setCurrentQ(idx)}
                  style={{
                    aspectRatio: '1', borderRadius: 7,
                    background: active ? '#2B5CE6' : answered ? '#ECFDF5' : '#F4F6FB',
                    color: active ? '#fff' : answered ? '#059669' : '#9CA3AF',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    border: active ? 'none' : answered ? '1px solid #A7F3D0' : '1px solid #E3E7F0',
                  }}
                >
                  {answered && !active ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Camera thumbnail */}
        <div style={{ padding: 12, borderTop: '1px solid #F0F3FA' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Video size={11} color="#059669" />
            {t('test.camera_monitoring')}
          </div>
          <div style={{
            width: '100%', aspectRatio: '16/9', borderRadius: 7,
            background: '#000', overflow: 'hidden',
            border: '1px solid #A7F3D0', position: 'relative',
          }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
          </div>
        </div>
      </div>

      {/* Center: Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {/* Timer bar */}
        <div style={{
          padding: '11px 20px', borderRadius: 12,
          background: '#fff',
          border: `1px solid ${isCriticalTime ? '#FECACA' : isLowTime ? '#FDE68A' : '#E3E7F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
            {course.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 100 }}>
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
          flex: 1, padding: '24px 28px', borderRadius: 14,
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
            width: 400, padding: 32, borderRadius: 16,
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