import { useEffect, useState } from 'react';

const MOBILE_MAX = 720;
const TABLET_MAX = 1024;

export function useViewport() {
  const [size, setSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const isLandscape = size.w > size.h;
  // "Mobile by short side": treat anything where the shorter dimension is
  // below the mobile breakpoint as a phone, including landscape phones whose
  // width might exceed MOBILE_MAX but whose height (the constraint) is small.
  const minDim = Math.min(size.w, size.h);
  const isMobile = minDim < MOBILE_MAX;

  return {
    width: size.w,
    height: size.h,
    isMobile,
    isTablet: !isMobile && size.w < TABLET_MAX,
    isDesktop: size.w >= TABLET_MAX,
    isLandscape,
    isMobileLandscape: isMobile && isLandscape,
  };
}
