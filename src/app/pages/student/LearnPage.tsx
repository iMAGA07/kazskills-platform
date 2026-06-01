import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import { useViewport } from '../../lib/useViewport';
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
  const scrollRef    = useRef<HTMLDivElement>(null);
  const stripRef     = useRef<HTMLDivElement>(null);
  const renderTask   = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const { isMobile, isMobileLandscape } = useViewport();

  const [pdfDoc,      setPdfDoc]      = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputVal, setInputVal]       = useState('1');
  const [hint, setHint] = useState(true); // first-time swipe hint on mobile
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [viewportTick, setViewportTick] = useState(0); // bumped on resize to re-render

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

  // Main canvas render.
  //
  // Two fit modes:
  //  • Inline / portrait  → FIT-TO-WIDTH. The page fills the container width so
  //    text is large and readable; tall pages scroll vertically. CRITICALLY,
  //    this depends ONLY on clientWidth (stable while scrolling), so the iOS
  //    Safari address-bar collapse — which changes the *height* — no longer
  //    rescales and jitters the page.
  //  • Fullscreen → FIT-TO-BOTH (contain). The whole slide is shown at once like
  //    a slideshow; in fullscreen the height is a stable fixed value, so reading
  //    it is safe.
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !scrollRef.current) return;
    let cancelled = false;
    if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (cancelled) return;
      const scrollEl = scrollRef.current;
      const canvas = canvasRef.current;
      if (!scrollEl || !canvas) return;

      const padX = 16, padY = 16;
      const availW = scrollEl.clientWidth  - padX;
      const availH = scrollEl.clientHeight - padY;
      // If the container hasn't been laid out yet, bail — the ResizeObserver
      // will fire once it has a real width and trigger a re-render.
      if (availW <= 0) return;

      const unscaled = page.getViewport({ scale: 1 });

      let cssScale: number;
      if (isFullscreen) {
        // contain: whole page visible
        cssScale = Math.min(availW / unscaled.width, availH / unscaled.height);
      } else {
        // fit width: fill the width, scroll vertically if taller
        cssScale = availW / unscaled.width;
      }
      cssScale = Math.max(0.2, Math.min(cssScale, 4));

      const viewport = page.getViewport({ scale: cssScale });

      // Render at devicePixelRatio for crispness on retina / mobile. Cap the
      // backing-store DPR to 2.5 so huge pages don't blow up canvas memory.
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width  = Math.floor(viewport.width  * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width  = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const task = page.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      task.promise.catch(() => {});
    });

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, viewportTick, isFullscreen]);

  // Re-render on resize, but ONLY when the WIDTH changes (or when in fullscreen,
  // where height matters for contain-fit). This is the key fix for the "content
  // shifts while scrolling" bug: on mobile, scrolling collapses the browser
  // chrome and changes the height by ~60-80px every time — we must ignore those
  // height-only changes in width-fit mode, otherwise the page rescales and jumps.
  useEffect(() => {
    if (!scrollRef.current) return;
    let lastW = 0;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      if (Math.abs(r.width - lastW) < 4) return; // ignore height-only changes
      lastW = r.width;
      setViewportTick(t => t + 1);
    });
    ro.observe(scrollRef.current);
    const onOri = () => setViewportTick(t => t + 1);
    window.addEventListener('orientationchange', onOri);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', onOri); };
  }, []);

  // Re-run the contain-fit render when entering/leaving fullscreen, where the
  // height suddenly matters (width may be unchanged so the ResizeObserver above
  // wouldn't catch it).
  useEffect(() => { setViewportTick(t => t + 1); }, [isFullscreen]);

  // Always start each new page at the top so paging never lands you mid-scroll
  // (another source of the "content shifts" feeling).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [currentPage]);

  // Render thumbnail strip once per loaded document (low scale, ~120px wide).
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    const out: Record<number, string> = {};
    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const v0 = page.getViewport({ scale: 1 });
          const targetW = 120;
          const scale = targetW / v0.width;
          const v = page.getViewport({ scale });
          const c = document.createElement('canvas');
          c.width = v.width; c.height = v.height;
          await page.render({ canvasContext: c.getContext('2d')!, viewport: v }).promise;
          out[i] = c.toDataURL('image/jpeg', 0.7);
          if (cancelled) return;
          // Update progressively so first thumbs appear before all are done.
          if (i % 3 === 0 || i === pdfDoc.numPages) {
            setThumbs({ ...out });
          }
        } catch { /* skip page */ }
      }
      if (!cancelled) setThumbs({ ...out });
    })();
    return () => { cancelled = true; };
  }, [pdfDoc]);

  // Keep the active thumbnail scrolled into view in the strip.
  useEffect(() => {
    if (!stripRef.current) return;
    const el = stripRef.current.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentPage]);

  // Real fullscreen API may fail on iOS Safari; we fall back to a pseudo-
  // fullscreen overlay via CSS so the button always works.
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!isFullscreen) {
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Stay in sync if the user exits the real fullscreen via ESC.
  useEffect(() => {
    const h = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // Auto-enter pseudo-fullscreen when the phone is rotated to landscape — in
  // portrait the viewer fits in the page layout, but in landscape the
  // surrounding chrome eats so much height that the slide gets squashed. On
  // landscape we want the whole screen.
  // We also exit when going back to portrait, so the page resumes its normal
  // scrollable layout.
  useEffect(() => {
    if (isMobileLandscape) {
      setIsFullscreen(true);
      // Bump the render so the canvas refits the new viewport immediately.
      setViewportTick(t => t + 1);
    } else if (isMobile) {
      // Only auto-exit on actual mobile devices — desktop users may want to
      // keep fullscreen on after orientation hijinks.
      setIsFullscreen(false);
      setViewportTick(t => t + 1);
    }
  }, [isMobileLandscape, isMobile]);

  const goPage = useCallback((delta: number) => {
    setCurrentPage(p => Math.max(1, Math.min(totalPages, p + delta)));
    // After a successful navigation we can dismiss the swipe hint.
    setHint(false);
  }, [totalPages]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goPage(+1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPage(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goPage]);

  // Touch swipe handlers — left/right swipe → next/prev page.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    touchStartRef.current = null;
    // Conservative swipe heuristic. Horizontal travel must clearly dominate
    // (>2× the vertical) so that reading a tall page by scrolling vertically
    // never accidentally flips to the next page. Min 60px, under 600ms.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2 && dt < 600) {
      goPage(dx > 0 ? -1 : 1);
    }
  };

  // Auto-hide the hint after a few seconds.
  useEffect(() => {
    if (!isMobile || !hint) return;
    const id = setTimeout(() => setHint(false), 3500);
    return () => clearTimeout(id);
  }, [isMobile, hint]);

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

  // When pseudo-fullscreen, cover the whole viewport. The real Fullscreen API
  // does this automatically; this branch is just for iOS Safari where the API
  // is unavailable on non-video elements.
  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        width: '100vw', height: '100dvh' as any,
        background: '#1A1A1C',
        display: 'flex', flexDirection: 'column',
      }
    : { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#3A3A3C' };

  return (
    <div ref={containerRef} style={containerStyle}>

      {/* Toolbar — compact on mobile (no page input/duplicate prev-next, just
          Download + Fullscreen + truncated title). Even slimmer on landscape
          so the slide gets the maximum vertical room. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: isMobileLandscape ? '4px 8px' : isMobile ? '8px 10px' : '7px 12px',
        background: 'rgba(0,0,0,0.78)', flexShrink: 0,
      }}>
        {isMobile ? (
          <>
            <IcDocument size={15} color="rgba(255,255,255,0.85)" />
            <span style={{
              flex: 1, minWidth: 0,
              fontSize: 12.5, color: 'rgba(255,255,255,0.9)',
              fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{title}</span>
          </>
        ) : (
          <>
            <TBtn onClick={() => goPage(-1)} disabled={currentPage <= 1} title="Предыдущая страница (←)">
              <IcChevronLeft size={16} color="currentColor" />
            </TBtn>

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
          </>
        )}

        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ width: 34, height: 34, borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer' }}
          title="Скачать PDF"
        >
          <IcDownload size={16} color="#fff" />
        </a>

        <TBtn onClick={toggleFullscreen} title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}>
          {isFullscreen ? <IcMinimize size={16} color="currentColor" /> : <IcMaximize size={16} color="currentColor" />}
        </TBtn>
      </div>

      {/* Canvas scroll area.
          • Inline (fit-width): vertical scroll, page pinned to the top so a tall
            document reads top-to-bottom. Horizontal hidden (page == full width).
          • Fullscreen (contain): no scroll, slide centred on both axes.
          touchAction pan-y lets the browser handle vertical scroll natively
          while our JS handles horizontal swipes for page changes. */}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          flex: 1,
          overflowY: isFullscreen ? 'hidden' : 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as any,
          display: 'flex',
          padding: 8,
          background: '#1A1A1C',
          position: 'relative',
          touchAction: 'pan-y',
        }}
      >
        {/* margin:auto centres the canvas both ways when it's smaller than the
            container, but collapses to 0 when it's taller — so a tall page
            stays scrollable to the very top (alignItems:center would clip it). */}
        <canvas ref={canvasRef} style={{
          boxShadow: '0 6px 28px rgba(0,0,0,0.55)',
          background: '#fff', borderRadius: 2,
          display: 'block',
          flexShrink: 0,
          margin: 'auto',
        }} />

        {/* First-time swipe hint on mobile */}
        {isMobile && hint && totalPages > 1 && (
          <div style={{
            position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(0,0,0,0.78)', color: '#fff',
            fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            <span>← Свайп для перелистывания →</span>
          </div>
        )}

        {/* Landscape floating controls — large round arrows on the sides
            + a page counter at the bottom centre. Replaces the row-bar to
            give the slide the most vertical room possible. */}
        {isMobileLandscape && totalPages > 1 && (
          <>
            <button
              onClick={() => goPage(-1)}
              disabled={currentPage <= 1}
              aria-label="Предыдущая страница"
              style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: currentPage <= 1 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.6)',
                color: currentPage <= 1 ? 'rgba(255,255,255,0.35)' : '#fff',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)' as any,
                zIndex: 5,
              }}
            >
              <IcChevronLeft size={22} color="currentColor" />
            </button>
            <button
              onClick={() => goPage(+1)}
              disabled={currentPage >= totalPages}
              aria-label="Следующая страница"
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: currentPage >= totalPages ? 'rgba(0,0,0,0.35)' : 'rgba(43,92,230,0.85)',
                color: currentPage >= totalPages ? 'rgba(255,255,255,0.35)' : '#fff',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)' as any,
                zIndex: 5,
              }}
            >
              <IcChevronRight size={22} color="currentColor" />
            </button>
            <div style={{
              position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)',
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              fontSize: 12, fontWeight: 600,
              backdropFilter: 'blur(6px)' as any,
              pointerEvents: 'none', zIndex: 5,
            }}>
              {currentPage} / {totalPages}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — tap on any thumb to jump straight to that page.
          Hidden in mobile landscape so the slide can use the full screen
          height; user can switch pages via swipe or the bottom nav. */}
      {totalPages > 1 && !isMobileLandscape && (
        <div
          ref={stripRef}
          style={{
            display: 'flex', gap: 8,
            padding: '8px 10px',
            background: 'rgba(0,0,0,0.78)',
            overflowX: 'auto',
            overflowY: 'hidden',
            flexShrink: 0,
            scrollbarWidth: 'none' as const,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
            const active = n === currentPage;
            const src = thumbs[n];
            return (
              <button
                key={n}
                data-thumb={n}
                onClick={() => setCurrentPage(n)}
                style={{
                  position: 'relative', flexShrink: 0,
                  width: isMobile ? 56 : 72, height: isMobile ? 74 : 96,
                  borderRadius: 6, padding: 0,
                  background: '#0F1117',
                  border: active ? '2px solid #2B5CE6' : '1.5px solid rgba(255,255,255,0.12)',
                  boxShadow: active ? '0 0 0 3px rgba(43,92,230,0.25)' : 'none',
                  cursor: 'pointer', overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
                title={`Страница ${n}`}
              >
                {src ? (
                  <img src={src} alt={`p${n}`} style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)', fontSize: 11,
                  }}>...</div>
                )}
                <span style={{
                  position: 'absolute', bottom: 2, left: 2,
                  padding: '1px 5px', borderRadius: 4,
                  background: active ? '#2B5CE6' : 'rgba(0,0,0,0.72)',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom nav. In mobile landscape we don't render a separate row —
          arrows float on top of the canvas instead, see the floating buttons
          below in the scrollRef container. */}
      {!isMobileLandscape && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: isMobile ? 8 : 14,
          padding: isMobile ? '10px 12px' : '9px 16px',
          background: 'rgba(0,0,0,0.65)', flexShrink: 0,
        }}>
          <button
            onClick={() => goPage(-1)} disabled={currentPage <= 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: isMobile ? '12px 14px' : '9px 20px',
              minWidth: isMobile ? 96 : undefined,
              borderRadius: 10, border: 'none',
              background: currentPage <= 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
              color: currentPage <= 1 ? 'rgba(255,255,255,0.25)' : '#fff',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? 14 : 13, fontWeight: 600,
              justifyContent: 'center',
            }}
          >
            <IcChevronLeft size={18} color="currentColor" />
            {!isMobile && 'Назад'}
          </button>

          <div style={{
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            minWidth: 80, textAlign: 'center', flexShrink: 0,
          }}>
            {currentPage} / {totalPages}
          </div>

          <button
            onClick={() => goPage(+1)} disabled={currentPage >= totalPages}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: isMobile ? '12px 14px' : '9px 20px',
              minWidth: isMobile ? 96 : undefined,
              borderRadius: 10, border: 'none',
              background: currentPage >= totalPages ? 'rgba(255,255,255,0.08)' : BLUE,
              color: currentPage >= totalPages ? 'rgba(255,255,255,0.25)' : '#fff',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? 14 : 13, fontWeight: 600,
              justifyContent: 'center',
            }}
          >
            {!isMobile && 'Вперёд'}
            <IcChevronRight size={18} color="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Doc Viewer ───────────────────────────────────────────────────────────────
// • PPTX/PPT  → MS Office Online  (slide-by-slide navigation built in)
// • All other → Google Docs viewer (clean, lightweight embed)
function DocViewer({ url, title, fileType }: { url: string; title: string; fileType: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attempt,    setAttempt]    = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [timedOut,   setTimedOut]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // PPTX/PPT use MS Office Online — the only browser viewer that shows
  // slides one-at-a-time with prev/next navigation.
  // Everything else uses Google Docs (lightweight, no Office branding).
  const isPresentation = ['pptx', 'ppt', 'ppsx', 'potx'].includes(fileType);
  const viewerUrl = isPresentation
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  useEffect(() => {
    setLoading(true);
    setTimedOut(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimedOut(true), 22000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [url, attempt]);

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
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#F8FAFD' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        background: '#fff', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
      }}>
        <IcPresentation size={15} color={BLUE} />
        <span style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF', marginRight: 4, flexShrink: 0 }}>
          {fileType.toUpperCase()}
        </span>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ width: 30, height: 30, borderRadius: 6, background: '#F3F4F6', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
          title="Скачать файл"
        >
          <IcDownload size={14} color="#374151" />
        </a>
        <button onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
          style={{ width: 30, height: 30, borderRadius: 6, background: '#F3F4F6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          {isFullscreen ? <IcMinimize size={14} color="#374151" /> : <IcMaximize size={14} color="#374151" />}
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, position: 'relative', background: '#F8FAFD' }}>

        {/* Loading overlay */}
        {loading && !timedOut && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <IcPresentation size={48} color="#D1D5DB" />
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Загрузка презентации…</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: BLUE, animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* Timed-out fallback */}
        {timedOut && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: '#F8FAFD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcPresentation size={36} color="#9CA3AF" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2937', marginBottom: 6 }}>Не удалось загрузить предпросмотр</div>
              <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 300, lineHeight: 1.6 }}>
                Скачайте файл и откройте в любой программе для просмотра.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={url} download target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, background: BLUE, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                <IcDownload size={14} color="#fff" /> Скачать файл
              </a>
              <button onClick={() => setAttempt(a => a + 1)}
                style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Повторить
              </button>
            </div>
          </div>
        )}

        <iframe
          key={`${url}-${attempt}`}
          src={viewerUrl}
          title={title}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          onLoad={() => { setLoading(false); if (timerRef.current) clearTimeout(timerRef.current); }}
          onError={() => { setLoading(false); setTimedOut(true); }}
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
  const { isMobile } = useViewport();

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

  // Enrollment guard: students can only learn courses assigned to them.
  const isAdmin = user?.role === 'admin';
  const isEnrolled = !!user && !!courseId && (user.enrolledCourses ?? []).includes(courseId);
  if (!course) return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Курс не найден</div>;
  if (!isAdmin && !isEnrolled) {
    return (
      <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>
        Этот курс вам не назначен. Обратитесь к администратору.
        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate('/student/courses')}
            style={{ color: '#2B5CE6', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Вернуться к курсам
          </button>
        </div>
      </div>
    );
  }
  if (!lesson)  return <div style={{ color: '#6B7280', textAlign: 'center', padding: '60px' }}>Материал не найден</div>;

  const youtubeId = lesson.type === 'video' ? getYouTubeId(lesson.url || '') : null;
  const ext = getExt(lesson.url || '');
  const isPdf = lesson.type === 'pdf' || ext === 'pdf';

  return (
    <div style={{
      maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column',
      // 100dvh follows the visible viewport on iOS Safari (collapsing address bar),
      // 100vh is the fallback for older browsers. Mobile header is ~56px so the
      // offset is smaller there, giving the viewer the most room possible.
      height: (isMobile ? 'calc(100dvh - 96px)' : 'calc(100dvh - 168px)') as any,
      minHeight: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 168px)',
    }}>

      {/* Breadcrumb + actions — compact icon row on mobile */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: isMobile ? 10 : 16,
        paddingBottom: isMobile ? 8 : 12,
        borderBottom: `1px solid ${BORDER}`,
        gap: 10,
      }}>
        <div style={{
          fontSize: isMobile ? 13 : 12, color: '#374151', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>
          {lesson.title}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            title="Вернуться к курсу"
            style={{
              padding: isMobile ? '8px 12px' : '8px 16px',
              borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff',
              color: '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? '← Назад' : 'Вернуться назад'}
          </button>
          <button
            onClick={() => navigate(`/student/test/${courseId}`)}
            style={{
              padding: isMobile ? '8px 12px' : '8px 16px',
              borderRadius: 8, border: 'none', background: BLUE, color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? 'К тесту' : 'К тестированию'}
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', position: 'relative', marginBottom: isMobile ? 10 : 16, minHeight: 0 }}>

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => prevLesson && navigate(`/student/learn/${courseId}/${prevLesson.id}`)}
          disabled={!prevLesson}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 14px' : '10px 20px', borderRadius: 8, border: `1px solid ${prevLesson ? BORDER : '#F0F3FA'}`, background: '#fff', color: prevLesson ? '#374151' : '#D1D5DB', cursor: prevLesson ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          <IcChevronLeft size={15} color="currentColor" /> {isMobile ? 'Назад' : 'Предыдущий'}
        </button>

        <div style={{ flex: 1 }} />

        {nextLesson ? (
          <button
            onClick={() => navigate(`/student/learn/${courseId}/${nextLesson.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 14px' : '10px 24px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Далее' : 'Следующий материал'} <IcChevronRight size={15} color="#fff" />
          </button>
        ) : (
          <button
            onClick={() => navigate(`/student/courses/${courseId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 16px' : '10px 24px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Завершить
          </button>
        )}
      </div>
    </div>
  );
}
