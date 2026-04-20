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

// ─── PDF Viewer with pdfjs-dist ──────────────────────────────────────────────
function PdfViewer({ url, title }: { url: string; title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTask   = useRef<any>(null);

  const [pdfDoc,      setPdfDoc]      = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load PDF.js worker lazily to avoid SSR issues
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    import('pdfjs-dist').then(async (pdfjsLib) => {
      if (cancelled) return;
      // Point worker at the copy bundled with pdfjs-dist
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;

      try {
        const doc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    });

    return () => { cancelled = true; };
  }, [url]);

  // Render page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    // Cancel any running render
    if (renderTask.current) {
      renderTask.current.cancel();
      renderTask.current = null;
    }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (cancelled) return;
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 32 : 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / unscaledViewport.width, 2.5);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      const task = page.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      task.promise.catch(() => { /* cancelled */ });
    });

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const goPage = useCallback((delta: number) => {
    setCurrentPage(p => Math.max(1, Math.min(totalPages, p + delta)));
  }, [totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goPage(+1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPage(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPage]);

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: '#F8FAFD' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid #FECACA`, borderTopColor: '#DC2626', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 14, color: '#6B7280' }}>Загрузка PDF…</span>
    </div>
  );

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: '#F8FAFD', padding: 32 }}>
      <div style={{ fontSize: 48 }}>📄</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Не удалось загрузить PDF</div>
        <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 300 }}>Попробуйте открыть файл напрямую</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" download
        style={{ padding: '10px 20px', borderRadius: 8, background: '#DC2626', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
        ⬇ Скачать PDF
      </a>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#525659', position: 'relative',
      }}
    >
      {/* Top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: 'rgba(0,0,0,0.75)', flexShrink: 0,
        gap: 12,
      }}>
        {/* Prev */}
        <button
          onClick={() => goPage(-1)}
          disabled={currentPage <= 1}
          style={{
            width: 34, height: 34, borderRadius: 7, border: 'none',
            background: currentPage <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            transition: 'background 0.15s',
          }}
          title="Предыдущая страница (←)"
        >‹</button>

        {/* Page counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Стр.</span>
          <input
            type="number"
            value={currentPage}
            min={1} max={totalPages}
            onChange={e => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) setCurrentPage(Math.max(1, Math.min(totalPages, v)));
            }}
            style={{
              width: 44, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13,
              textAlign: 'center', outline: 'none',
            }}
          />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>/ {totalPages}</span>
        </div>

        {/* Next */}
        <button
          onClick={() => goPage(+1)}
          disabled={currentPage >= totalPages}
          style={{
            width: 34, height: 34, borderRadius: 7, border: 'none',
            background: currentPage >= totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            color: currentPage >= totalPages ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            transition: 'background 0.15s',
          }}
          title="Следующая страница (→)"
        >›</button>

        <div style={{ flex: 1 }} />

        {/* Download */}
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{
            width: 34, height: 34, borderRadius: 7,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', textDecoration: 'none', fontSize: 15,
          }}
          title="Скачать"
        >⬇</a>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          style={{
            width: 34, height: 34, borderRadius: 7, border: 'none',
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '16px', background: '#525659' }}>
        <canvas
          ref={canvasRef}
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)', background: '#fff', maxWidth: '100%' }}
        />
      </div>

      {/* Bottom prev/next large arrow buttons */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
        padding: '10px 16px', background: 'rgba(0,0,0,0.6)', flexShrink: 0,
      }}>
        <button
          onClick={() => goPage(-1)}
          disabled={currentPage <= 1}
          style={{
            padding: '8px 24px', borderRadius: 8, border: 'none',
            background: currentPage <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
          }}
        >← Назад</button>

        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 80, textAlign: 'center' }}>
          {currentPage} из {totalPages}
        </span>

        <button
          onClick={() => goPage(+1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '8px 24px', borderRadius: 8, border: 'none',
            background: currentPage >= totalPages ? 'rgba(255,255,255,0.1)' : BLUE,
            color: currentPage >= totalPages ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
          }}
        >Вперёд →</button>
      </div>
    </div>
  );
}

// ─── Google-Docs Viewer (PPTX / generic docs) ────────────────────────────────
function DocViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  // Timeout fallback
  useEffect(() => {
    setLoading(true); setError(false);
    const t = setTimeout(() => { if (loading) setError(true); }, 15000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: '#525659' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '8px 16px', background: 'rgba(0,0,0,0.75)', flexShrink: 0, gap: 8,
      }}>
        <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ width: 34, height: 34, borderRadius: 7, background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15 }}
          title="Скачать"
        >⬇</a>
        <button onClick={toggleFullscreen}
          style={{ width: 34, height: 34, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
        >{isFullscreen ? '✕' : '⛶'}</button>
      </div>

      {/* Loading overlay */}
      {loading && !error && (
        <div style={{ position: 'absolute', inset: '44px 0 0 0', zIndex: 5, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Загрузка документа…</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Открытие через Google Docs Viewer</span>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #FDE68A', borderTopColor: '#D97706', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{ position: 'absolute', inset: '44px 0 0 0', zIndex: 5, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Предпросмотр недоступен</div>
            <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 320, lineHeight: 1.5 }}>
              Google Docs Viewer не смог загрузить файл. Скачайте и откройте локально.
            </div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" download
            style={{ padding: '10px 20px', borderRadius: 8, background: '#D97706', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            ⬇ Скачать файл
          </a>
          <button onClick={() => { setError(false); setLoading(true); }}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '7px 16px', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
            Попробовать снова
          </button>
        </div>
      )}

      <iframe
        key={viewerUrl}
        src={viewerUrl}
        title={title}
        style={{ flex: 1, border: 'none', width: '100%', display: error ? 'none' : 'block' }}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
}

// ─── Main LearnPage ───────────────────────────────────────────────────────────
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

  // Determine if file is a PDF by URL extension or type
  const isPdf = lesson.type === 'pdf' || (lesson.type !== 'video' && /\.pdf($|\?)/i.test(lesson.url || ''));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
          {course.title} / {lesson.title}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER}`,
              background: '#fff', color: '#6B7280', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; (e.currentTarget as HTMLButtonElement).style.color = BLUE; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            Вернуться назад
          </button>
          <button
            onClick={() => navigate(`/student/test/${courseId}`)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            К тестированию
          </button>
        </div>
      </div>

      {/* Content viewer */}
      <div style={{
        flex: 1, background: '#fff', borderRadius: '12px', border: `1px solid ${BORDER}`,
        overflow: 'hidden', position: 'relative', marginBottom: '16px',
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

        {/* PDF — paginated viewer with PDF.js */}
        {lesson.type !== 'video' && lesson.url && isPdf && (
          <PdfViewer url={lesson.url} title={lesson.title} />
        )}

        {/* PPTX / other documents — Google Docs Viewer */}
        {lesson.type !== 'video' && lesson.url && !isPdf && (
          <DocViewer url={lesson.url} title={lesson.title} />
        )}

        {lesson.type !== 'video' && !lesson.url && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
            <p>Файл не загружен</p>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => prevLesson && navigate(`/student/learn/${courseId}/${prevLesson.id}`)}
          disabled={!prevLesson}
          style={{
            padding: '10px 20px', borderRadius: '8px',
            border: `1px solid ${prevLesson ? BORDER : '#F0F3FA'}`, background: '#fff',
            color: prevLesson ? '#374151' : '#D1D5DB',
            cursor: prevLesson ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 500,
          }}
          onMouseEnter={e => { if (prevLesson) { (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; (e.currentTarget as HTMLButtonElement).style.color = BLUE; } }}
          onMouseLeave={e => { if (prevLesson) { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; } }}
        >
          ← Предыдущий
        </button>

        <div style={{ flex: 1 }} />

        {nextLesson ? (
          <button
            onClick={() => navigate(`/student/learn/${courseId}/${nextLesson.id}`)}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Следующий материал →
          </button>
        ) : (
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
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
