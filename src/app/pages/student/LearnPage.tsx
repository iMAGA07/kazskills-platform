import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';

const NAVY  = '#1B3D84';
const BLUE  = '#2B5CE6';
const BORDER = '#E3E7F0';

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

// ─── File Viewer Component ────────────────────────────────────────────────────
function FileViewer({ url, type, title }: { url: string; type: 'pdf' | 'pptx'; title: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const viewerUrl = type === 'pdf'
    ? url
    : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setError(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [url, loading]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: '#F8FAFD',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: type === 'pdf' ? '#FEF2F2' : '#FFFBEB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            {type === 'pdf' ? '📄' : '📊'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Загрузка {type === 'pdf' ? 'PDF документа' : 'презентации'}...
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {type === 'pptx' ? 'Открытие через Google Docs Viewer' : 'Подготовка файла'}
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `3px solid ${type === 'pdf' ? '#FECACA' : '#FDE68A'}`,
            borderTopColor: type === 'pdf' ? '#DC2626' : '#D97706',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: '#F8FAFD',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          padding: 32,
        }}>
          <div style={{ fontSize: 48 }}>{type === 'pdf' ? '📄' : '📊'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Предпросмотр недоступен
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', maxWidth: 320, lineHeight: 1.5 }}>
              {type === 'pptx'
                ? 'Google Docs Viewer не смог загрузить файл. Скачайте и откройте презентацию локально.'
                : 'Не удалось отобразить PDF. Откройте файл в новой вкладке.'}
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8,
              background: type === 'pdf' ? '#DC2626' : '#D97706',
              color: '#fff', textDecoration: 'none',
              fontSize: '13px', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            ⬇ Скачать {type === 'pdf' ? 'PDF' : 'PPTX'}
          </a>
          <button
            onClick={() => { setError(false); setLoading(true); }}
            style={{
              background: 'none', border: `1px solid ${BORDER}`,
              borderRadius: 7, padding: '7px 16px',
              fontSize: '12px', color: '#6B7280', cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        key={viewerUrl}
        src={viewerUrl}
        title={title}
        style={{ flex: 1, border: 'none', width: '100%', display: error ? 'none' : 'block' }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default function LearnPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getCourse, getProgress, markLessonComplete } = useCourses();

  const course = courseId ? getCourse(courseId) : undefined;
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const lessonIdx  = course ? course.lessons.findIndex(l => l.id === lessonId) : -1;
  const lesson     = course && lessonIdx >= 0 ? course.lessons[lessonIdx] : null;
  const prevLesson = course && lessonIdx > 0 ? course.lessons[lessonIdx - 1] : null;
  const nextLesson = course && lessonIdx >= 0 && lessonIdx < course.lessons.length - 1 ? course.lessons[lessonIdx + 1] : null;

  useEffect(() => {
    if (!user || !courseId) return;
    getProgress(user.id, courseId)
      .then(p => setProgress(p))
      .catch(console.error);
  }, [user, courseId]);

  if (!course) return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Курс не найден</div>;
  if (!lesson)  return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Материал не найден</div>;

  const youtubeId = lesson.type === 'video' ? getYouTubeId(lesson.url || '') : null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
          {course.title} / {lesson.title}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${BORDER}`,
              background: '#fff',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE;
              (e.currentTarget as HTMLButtonElement).style.color = BLUE;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
              (e.currentTarget as HTMLButtonElement).style.color = '#6B7280';
            }}
          >
            Вернуться назад
          </button>
          <button
            onClick={() => navigate(`/student/test/${courseId}`)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: BLUE,
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            К тестированию
          </button>
        </div>
      </div>

      {/* Content viewer */}
      <div style={{
        flex: 1,
        background: '#fff',
        borderRadius: '12px',
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '16px',
      }}>
        {/* YouTube */}
        {lesson.type === 'video' && youtubeId && (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={lesson.title}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {lesson.type === 'video' && !youtubeId && lesson.url && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, color: '#6B7280' }}>
            <p style={{ margin: 0 }}>Не удалось распознать YouTube ссылку</p>
            <a href={lesson.url} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, fontSize: '13px' }}>{lesson.url}</a>
          </div>
        )}
        {lesson.type === 'video' && !lesson.url && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
            <p>Ссылка на видео не указана</p>
          </div>
        )}

        {/* PDF */}
        {lesson.type === 'pdf' && lesson.url && (
          <FileViewer url={lesson.url} type="pdf" title={lesson.title} />
        )}
        {lesson.type === 'pdf' && !lesson.url && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
            <p>Файл PDF не загружен</p>
          </div>
        )}

        {/* PPTX */}
        {lesson.type === 'pptx' && lesson.url && (
          <FileViewer url={lesson.url} type="pptx" title={lesson.title} />
        )}
        {lesson.type === 'pptx' && !lesson.url && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
            <p>Файл презентации не загружен</p>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
      }}>
        <button
          onClick={() => prevLesson && navigate(`/student/learn/${courseId}/${prevLesson.id}`)}
          disabled={!prevLesson}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${prevLesson ? BORDER : '#F0F3FA'}`,
            background: '#fff',
            color: prevLesson ? '#374151' : '#D1D5DB',
            cursor: prevLesson ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (prevLesson) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE;
              (e.currentTarget as HTMLButtonElement).style.color = BLUE;
            }
          }}
          onMouseLeave={e => {
            if (prevLesson) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
              (e.currentTarget as HTMLButtonElement).style.color = '#374151';
            }
          }}
        >
          ← Предыдущий
        </button>

        <div style={{ flex: 1 }} />

        {nextLesson ? (
          <button
            onClick={() => navigate(`/student/learn/${courseId}/${nextLesson.id}`)}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#10B981',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Следующий слайд →
          </button>
        ) : (
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#10B981',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Завершить ✓
          </button>
        )}
      </div>
    </div>
  );
}
