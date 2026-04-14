import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  onDark?: boolean;
}

export function Logo({ size = 'md', variant = 'full', onDark = true }: LogoProps) {
  const s = { sm: { icon: 30, text: '13px', sub: '9px' }, md: { icon: 36, text: '15px', sub: '9.5px' }, lg: { icon: 44, text: '19px', sub: '11px' } }[size];
  const textColor = onDark ? '#fff' : '#0F1629';
  const subColor = onDark ? 'rgba(255,255,255,0.45)' : '#6B7280';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B7AFF"/>
            <stop offset="100%" stopColor="#5B4EF0"/>
          </linearGradient>
        </defs>
        {/* Hexagon */}
        <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#logoGrad)"/>
        {/* Inner hexagon outline */}
        <polygon points="20,6 32,13 32,27 20,34 8,27 8,13" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
        {/* Shield path inside */}
        <path d="M20 11L28 15V22C28 26.5 20 30 20 30C20 30 12 26.5 12 22V15L20 11Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        {/* STK initials */}
        <text x="20" y="23" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.5">KS</text>
      </svg>

      {variant === 'full' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: s.text, fontWeight: 700, color: textColor, letterSpacing: '0.01em' }}>KAZSKILLS</span>
          <span style={{ fontSize: s.sub, color: subColor, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '2px' }}>Образовательная платформа</span>
        </div>
      )}
    </div>
  );
}