import React from 'react';
import { getCurrentOrganization, useOrganizations } from '../../lib/organization';
import { LOGO_DATA_URL } from '../../assets/logo';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  onDark?: boolean;
}

export function Logo({ size = 'md', variant = 'full', onDark = true }: LogoProps) {
  // Re-render when the registry updates.
  useOrganizations();
  const org = getCurrentOrganization();
  const s = { sm: { icon: 30, text: '13px', sub: '9px' }, md: { icon: 36, text: '15px', sub: '9.5px' }, lg: { icon: 44, text: '19px', sub: '11px' } }[size];
  const textColor = onDark ? '#fff' : '#0F1629';
  const subColor = onDark ? 'rgba(255,255,255,0.45)' : '#6B7280';

  // Tenant with uploaded logo — use the uploaded image.
  if (org?.logoUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src={org.logoUrl} alt={org.displayName}
          style={{ height: s.icon, maxWidth: 140, objectFit: 'contain' }}
        />
        {variant === 'full' && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: s.text, fontWeight: 700, color: textColor, letterSpacing: '0.01em' }}>{org.displayName}</span>
            <span style={{ fontSize: s.sub, color: subColor, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '2px' }}>Образовательная платформа</span>
          </div>
        )}
      </div>
    );
  }

  // Default shield logo. Show tenant display name if on a tenant, else KAZSKILLS.
  const headline = (org?.displayName ?? 'KAZSKILLS').toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={LOGO_DATA_URL} alt={headline}
        width={s.icon} height={s.icon}
        style={{ width: s.icon, height: s.icon, borderRadius: '50%', objectFit: 'cover', background: '#fff', flexShrink: 0 }}
      />

      {variant === 'full' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: s.text, fontWeight: 700, color: textColor, letterSpacing: '0.01em' }}>{headline}</span>
          <span style={{ fontSize: s.sub, color: subColor, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '2px' }}>Образовательная платформа</span>
        </div>
      )}
    </div>
  );
}