import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';
import { IcCheckCircle, IcXCircle, IcMedal, IcRefresh, IcArrowLeft, IcTimer, IcTarget, IcTrendingUp } from '../../components/Icons';

export default function ResultsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { getCourse } = useCourses();

  const course = courseId ? getCourse(courseId) : undefined;
  const state = location.state as { score: number; passed: boolean; timeSpent: number; autoSubmit?: boolean } | null;

  if (!course || !state) { navigate('/student/courses'); return null; }

  const { score, passed, timeSpent, autoSubmit } = state;
  const passingScore = course.test.passingScore;
  const scoreColor = score >= 90 ? '#059669' : score >= passingScore ? '#2B5CE6' : score >= passingScore - 15 ? '#D97706' : '#DC2626';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <button
        onClick={() => navigate(`/student/courses/${courseId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '13.5px', marginBottom: '24px', padding: 0 }}
      >
        <IcArrowLeft size={16} color="currentColor" /> {t('results.back_to_course')}
      </button>

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `1px solid ${passed ? '#A7F3D0' : '#FECACA'}` }}>
        <div style={{ height: '4px', background: passed ? 'linear-gradient(90deg, #059669, #10B981)' : 'linear-gradient(90deg, #DC2626, #EF4444)' }} />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          {autoSubmit && (
            <div style={{ padding: '8px 16px', borderRadius: '20px', marginBottom: '20px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'inline-block' }}>
              <span style={{ fontSize: '13px', color: '#D97706' }}>⏰ Тест завершён автоматически — время вышло</span>
            </div>
          )}
          {/* Score ring */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="54" fill="none" stroke="#F0F3FA" strokeWidth="9" />
              <circle cx="65" cy="65" r="54" fill="none" stroke={scoreColor} strokeWidth="9"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - score / 100)}`}
                strokeLinecap="round" transform="rotate(-90 65 65)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '30px', fontWeight: 800, color: scoreColor }}>{score}%</span>
              <span style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '1px' }}>{t('results.score')}</span>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            {passed
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
                  <IcCheckCircle size={26} color="#059669" />
                  <h2 style={{ margin: 0, color: '#059669' }}>{t('results.congratulations')}</h2>
                </div>
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
                  <IcXCircle size={26} color="#DC2626" />
                  <h2 style={{ margin: 0, color: '#DC2626' }}>{t('results.better_luck')}</h2>
                </div>
            }
          </div>
          <p style={{ color: '#6B7280', fontSize: '13.5px', margin: '0 0 10px' }}>{course.title}</p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '20px',
            background: passed ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${passed ? '#A7F3D0' : '#FECACA'}`,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: passed ? '#059669' : '#DC2626' }}>
              {passed ? t('results.passed') : t('results.failed')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { icon: IcTarget, label: 'Проходной балл', value: `${passingScore}%`, color: '#2B5CE6', bg: '#EBF1FE' },
          { icon: IcTrendingUp, label: 'Ваш результат', value: `${score}%`, color: scoreColor, bg: '#F4F6FB' },
          { icon: IcTimer, label: t('results.time_spent'), value: `${timeSpent} мин`, color: '#7C3AED', bg: '#F5F3FF' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} style={{ padding: '18px', borderRadius: '12px', background: bg, border: `1px solid ${color}20`, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Icon size={19} color={color} style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F1629' }}>{value}</div>
            <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar breakdown */}
      <div style={{ padding: '20px 24px', borderRadius: '12px', background: '#fff', border: '1px solid #E3E7F0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 14px', color: '#0F1629', fontSize: '14px' }}>Детализация результата</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <div style={{ flex: 1, height: '9px', borderRadius: '5px', background: '#F0F3FA', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: '5px', transition: 'width 1s ease' }} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor, minWidth: '48px' }}>{score}%</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { color: '#059669', label: 'Правильно', val: `≈${Math.round(score / 10)} / ${course.test.questions.length}` },
            { color: '#DC2626', label: 'Неправильно', val: `≈${course.test.questions.length - Math.round(score / 10)} / ${course.test.questions.length}` },
          ].map(({ color, label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '12.5px', color: '#6B7280' }}>{label}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {passed
          ? <button
              onClick={() => navigate('/student/certificates')}
              style={{
                flex: 1, padding: '13px', borderRadius: '9px', border: 'none',
                background: 'linear-gradient(135deg, #059669, #10B981)',
                color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
              }}
            >
              <IcMedal size={17} color="#fff" />
              {t('results.get_certificate')}
            </button>
          : <button
              onClick={() => navigate(`/student/test/${courseId}`)}
              style={{
                flex: 1, padding: '13px', borderRadius: '9px', border: 'none',
                background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px rgba(43,92,230,0.3)',
              }}
            >
              <IcRefresh size={16} color="#fff" />
              {t('results.retry')}
            </button>
        }
        <button
          onClick={() => navigate(`/student/courses/${courseId}`)}
          style={{
            flex: 1, padding: '13px', borderRadius: '9px',
            border: '1.5px solid #E3E7F0', background: '#fff',
            color: '#374151', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <IcArrowLeft size={15} color="currentColor" />
          {t('results.back_to_course')}
        </button>
      </div>
    </div>
  );
}