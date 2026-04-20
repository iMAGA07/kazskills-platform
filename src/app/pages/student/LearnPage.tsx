import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import {
  IcDocument, IcPresentation, IcDownload, IcClose,
  IcMaximize, IcMinimize, IcChevronLeft, IcChevronRight,
} from '../../components/Icons';

const BLUE  = '#2B5CE6';
const NAVY  = '#1B3D84';
const BORDER = '#E3E7F0';

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

/** Detect file extension from a URL */
function getExt(url: string) {
  return (url.split('?')[0].split('.').pop() ?? '').toLowerCase();
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TBtn({
  onClick, title, children, disabled = false,
}: { onClick?: () => void; title?: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 7, border: 'none',
        background: disabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.14)',
        color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)'; }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
    >
      {children}
    </button>
  );
}

// ─── PDF Viewer (PDF.js canvas) ───────────────────────────────────────────────
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
  const [inputVal, setInputVal]       = useState('1');

  // Sync input with currentPage
  useEffect(() => { setInputVal(String(currentPage)); }, [currentPage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);

    import('pdfjs-dist').then(async (pdfjsLib) => {
      if (cancelled) return;
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
      } catch { if (!cancelled) { setError(true); setLoading(false); } }
    });

    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (cancelled) return;
      const containerWidth = (containerRef.current?.clientWidth ?? 820) - 32;
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / unscaled.width, 2.5);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport });
      renderTask.current = task;
      task.promise.catch(() => {});
    });

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const goPage = useCallback((delta: number) => {
    setCurrentPage(p => Math.max(1, Math.min(totalPages, p + delta)));
  }, [totalPages]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goPage(+1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPage(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goPage]);

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: '#F8FAFD' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid #FECACA`, borderTopColor: '#DC2626', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <IcDocument size={32} color="#D1D5DB" />
      <span style={{ fontSize: 14, color: '#6B7280' }}>Загрузка PDF…</span>
    </div>
  );

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: '#F8FAFD', padding: 32 }}>
      <IcDocument size={52} color="#D1D5DB" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Не удалось загрузить PDF</div>
        <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 300 }}>Попробуйте открыть файл напрямую</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" download
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#DC2626', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
        <IcDownload size={15} color="#fff" /> Скачать PDF
      </a>
    </div>
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#3A3A3C' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(0,0,0,0.7)', flexShrink: 0 }}>
        <TBtn onClick={() => goPage(-1)} disabled={currentPage <= 1} title="Предыдущая страница (←)">
          <IcChevronLeft size={16} color="currentColor" />
        </TBtn>

        {/* Page input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" value={inputVal} min={1} max={totalPages}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => {
              const v = parseInt(inputVal);
              if (!isNaN(v)) setCurrentPage(Math.max(1, Math.min(totalPages, v)));
              else setInputVal(String(currentPage));
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            style={{
              width: 44, padding: '4px 6px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontSize: 13, textAlign: 'center', outline: 'none',
            }}
          />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>/ {totalPages}</span>
        </div>

        <TBtn onClick={() => goPage(+1)} disabled={currentPage >= totalPages} title="Следующая страница (→)">
          <IcChevronRight size={16} color="currentColor" />
        </TBtn>

        <div style={{ flex: 1 }} />

        {/* Download */}
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ width: 34, height: 34, borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer' }}
          title="Скачать PDF"
        >
          <IcDownload size={16} color="#fff" />
        </a>

        {/* Fullscreen */}
        <TBtn onClick={toggleFullscreen} title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}>
          {isFullscreen ? <IcMinimize size={16} color="currentColor" /> : <IcMaximize size={16} color="currentColor" />}
        </TBtn>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 16, background: '#3A3A3C' }}>
        <canvas ref={canvasRef} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.45)', background: '#fff', maxWidth: '100%' }} />
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, padding: '9px 16px', background: 'rgba(0,0,0,0.55)', flexShrink: 0 }}>
        <button
          onClick={() => goPage(-1)} disabled={currentPage <= 1}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 20px', borderRadius: 8, border: 'none', background: currentPage <= 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)', color: currentPage <= 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          <IcChevronLeft size={14} color="currentColor" /> Назад
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', minWidth: 80, textAlign: 'center' }}>
          {currentPage} из {totalPages}
        </span>
        <button
          onClick={() => goPage(+1)} disabled={currentPage >= totalPages}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 20px', borderRadius: 8, border: 'none', background: currentPage >= totalPages ? 'rgba(255,255,255,0.08)' : BLUE, color: currentPage >= totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          Вперёд <IcChevronRight size={14} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

// ─── Office / Doc Viewer (MS Office Online for pptx/docx, Google Docs fallback) ──
function DocViewer({ url, title, fileType }: { url: string; title: string; fileType: string }) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // MS Office Online handles pptx/ppt/docx/doc/xlsx/xls natively with slide UI
  const isMsOffice = ['pptx', 'ppt', 'ppsx', 'potx', 'docx', 'doc', 'xlsx', 'xls'].includes(fileType);
  const viewerUrl  = isMsOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  useEffect(() => {
    setLoading(true); setError(false);
    const t = setTimeout(() => setError(true), 20000);
    return () => clearTimeout(t);
  }, [url]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#3A3A3C' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(0,0,0,0.7)', flexShrink: 0 }}>
        <IcPresentation size={16} color="rgba(255,255,255,0.5)" />
        <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ width: 34, height: 34, borderRadius: 7, background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          title="Скачать файл"
        >
          <IcDownload size={16} color="#fff" />
        </a>
        <TBtn onClick={toggleFullscreen} title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}>
          {isFullscreen ? <IcMinimize size={16} color="currentColor" /> : <IcMaximize size={16} color="currentColor" />}
        </TBtn>
      </div>

      {/* Loading */}
      {loading && !error && (
        <div style={{ position: 'absolute', inset: '48px 0 0 0', zIndex: 5, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <IcPresentation size={52} color="#D1D5DB" />
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Загрузка документа…</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            {isMsOffice ? 'Microsoft Office Online Viewer' : 'Google Docs Viewer'}
          </span>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid #FDE68A`, borderTopColor: '#D97706', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ position: 'absolute', inset: '48px 0 0 0', zIndex: 5, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
          <IcPresentation size={52} color="#D1D5DB" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Предпросмотр недоступен</div>
            <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 320, lineHeight: 1.5 }}>
              Не удалось загрузить файл через онлайн-просмотрщик. Скачайте и откройте локально.
            </div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" download
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: NAVY, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <IcDownload size={15} color="#fff" /> Скачать файл
          </a>
          <button onClick={() => { setError(false); setLoading(true); }}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '7px 16px', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
            Попробовать снова
          </button>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          key={viewerUrl}
          src={viewerUrl}
          title={title}
          style={{ width: '100%', height: '100%', border: 'none', display: error ? 'none' : 'block' }}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}

// ─── Main LearnPage ───────────────────────────────────────────────────────────
export default function LearnPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getCourse, getProgress } = useCourses();

  const course = courseId ? getCourse(courseId) : undefined;
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const lessonIdx  = course ? course.lessons.findIndex(l => l.id === lessonId) : -1;
  const lesson     = course && lessonIdx >= 0 ? course.lessons[lessonIdx] : null;
  const prevLesson = course && lessonIdx > 0 ? course.lessons[lessonIdx - 1] : null;
  const nextLesson = course && lessonIdx >= 0 && lessonIdx < course.lessons.length - 1 ? course.lessons[lessonIdx + 1] : null;

  useEffect(() => {
    if (!user || !courseId) return;
    getProgress(user.id, courseId).then(p => setProgress(p)).catch(console.error);
  }, [user, courseId]);

  if (!course) return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Курс не найден</div>;
  if (!lesson)  return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Материал не найден</div>;

  const youtubeId = lesson.type === 'video' ? getYouTubeId(lesson.url || '') : null;
  const ext = getExt(lesson.url || '');
  const isPdf = lesson.type === 'pdf' || ext === 'pdf';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>

      {/* Breadcrumb + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {course.title} / {lesson.title}
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; (e.currentTarget as HTMLButtonElement).style.color = BLUE; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            Вернуться назад
          </button>
          <button
            onClick={() => navigate(`/student/test/${courseId}`)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            К тестированию
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', position: 'relative', marginBottom: 16 }}>

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
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6B7280' }}>
            <p style={{ margin: 0 }}>Не удалось распознать YouTube ссылку</p>
            <a href={lesson.url} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, fontSize: 13 }}>{lesson.url}</a>
          </div>
        )}
        {lesson.type === 'video' && !lesson.url && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
            <p>Ссылка на видео не указана</p>
          </div>
        )}

        {/* PDF → custom paginated viewer */}
        {lesson.type !== 'video' && lesson.url && isPdf && (
          <PdfViewer url={lesson.url} title={lesson.title} />
        )}

        {/* Office / other docs → MS Office Online or Google Docs viewer */}
        {lesson.type !== 'video' && lesson.url && !isPdf && (
          <DocViewer url={lesson.url} title={lesson.title} fileType={ext} />
        )}

        {lesson.type !== 'video' && !lesson.url && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
            <p>Файл не загружен</p>
          </div>
        )}
      </div>

      {/* Prev / Next lesson */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => prevLesson && navigate(`/student/learn/${courseId}/${prevLesson.id}`)}
          disabled={!prevLesson}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: `1px solid ${prevLesson ? BORDER : '#F0F3FA'}`, background: '#fff', color: prevLesson ? '#374151' : '#D1D5DB', cursor: prevLesson ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}
          onMouseEnter={e => { if (prevLesson) { (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; (e.currentTarget as HTMLButtonElement).style.color = BLUE; } }}
          onMouseLeave={e => { if (prevLesson) { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; } }}
        >
          <IcChevronLeft size={15} color="currentColor" /> Предыдущий
        </button>

        <div style={{ flex: 1 }} />

        {nextLesson ? (
          <button
            onClick={() => navigate(`/student/learn/${courseId}/${nextLesson.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Следующий материал <IcChevronRight size={15} color="#fff" />
          </button>
        ) : (
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Завершить
          </button>
        )}
      </div>
    </div>
  );
}
