import { useEffect, useState } from 'react';

const MOBILE_MAX = 720;
const TABLET_MAX = 1024;

export function useViewport() {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return {
    width,
    isMobile: width < MOBILE_MAX,
    isTablet: width >= MOBILE_MAX && width < TABLET_MAX,
    isDesktop: width >= TABLET_MAX,
  };
}
