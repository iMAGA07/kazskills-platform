import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Language } from '../../i18n/translations';

const LANGS: { code: Language; label: string }[] = [
  { code: 'kz', label: 'ҚАЗ' },
  { code: 'ru', label: 'РУС' },
  { code: 'en', label: 'ENG' },
];

export function LanguageSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, setLang } = useLanguage();
  const isDark = variant === 'dark';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      background: isDark ? 'rgba(255,255,255,0.06)' : '#F0F3FA',
      borderRadius: '8px',
      padding: '3px',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E3E7F0',
    }}>
      {LANGS.map(({ code, label }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              fontSize: '11px',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.04em',
              padding: '4px 9px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: active ? (isDark ? '#2B5CE6' : '#2B5CE6') : 'transparent',
              color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.45)' : '#6B7280'),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
