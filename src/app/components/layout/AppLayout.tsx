import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { IcBook, IcFileText, IcBell, IcCamera, IcLogout } from '../Icons';
import { useLanguage } from '../../context/LanguageContext';

// Logo component
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="8" fill="url(#grad)"/>
      <path d="M18 10L26 14V22L18 26L10 22V14L18 10Z" fill="#fff" opacity="0.9"/>
      <path d="M18 18L26 14" stroke="#1B3D84" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18 18L10 14" stroke="#1B3D84" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18 18V26" stroke="#1B3D84" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="18" cy="18" r="2" fill="#1B3D84"/>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2B5CE6"/>
          <stop offset="1" stopColor="#1B3D84"/>
        </linearGradient>
      </defs>
    </svg>
    <div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1B3D84', lineHeight: 1, letterSpacing: '0.5px' }}>
        KAZSKILLS
      </div>
      <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.4, letterSpacing: '0.3px' }}>
        ОБУЧАЮЩАЯ ПЛАТФОРМА
      </div>
    </div>
  </div>
);

export function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const isStudent = user.role === 'student';
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#EDF0F8' }}>
      {/* Top Navigation */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E3E7F0',
        boxShadow: '0 1px 0 #E3E7F0',
      }}>
        <div style={{
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          gap: '32px',
        }}>
          {/* Left: Logo + Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Logo />
            
            {/* Navigation tabs */}
            {isStudent && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => navigate('/student/courses')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: isActive('/student/courses') ? '#EBF1FE' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive('/student/courses') ? '#2B5CE6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive('/student/courses')) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#F4F6FB';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive('/student/courses')) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  <IcBook size={16} color="currentColor" />
                  <span>{t('nav.my_courses')}</span>
                </button>

                <button
                  onClick={() => navigate('/student/documents')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: isActive('/student/documents') ? '#EBF1FE' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive('/student/documents') ? '#2B5CE6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive('/student/documents')) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#F4F6FB';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive('/student/documents')) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  <IcFileText size={16} color="currentColor" />
                  <span>{t('nav.documents')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Language + Bell + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher variant="light" />

            {/* Bell */}
            <button
              style={{
                width: 36,
                height: 36,
                borderRadius: '9px',
                background: '#F4F6FB',
                border: '1px solid #E3E7F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6B7280',
                position: 'relative',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B5CE6';
                (e.currentTarget as HTMLButtonElement).style.color = '#2B5CE6';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
                (e.currentTarget as HTMLButtonElement).style.color = '#6B7280';
              }}
            >
              <IcBell size={17} color="currentColor" />
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '7px',
                height: '7px',
                background: '#DC2626',
                borderRadius: '50%',
                border: '1.5px solid #fff',
              }} />
            </button>

            {/* Avatar with dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowProfileMenu(v => !v)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {user.name.charAt(0)}
              </div>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 999,
                    }}
                  />
                  {/* Menu */}
                  <div style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    width: '320px',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    border: '1px solid #E3E7F0',
                  }}>
                    {/* Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                      padding: '20px',
                      color: '#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 700,
                          position: 'relative',
                        }}>
                          {user.name.charAt(0)}
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '14px',
                            height: '14px',
                            background: '#10B981',
                            border: '2px solid #2B5CE6',
                            borderRadius: '50%',
                          }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>
                            {user.name.split(' ').slice(0, 2).join(' ')}
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.85 }}>
                            {user.organization}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: '8px' }}>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          // Handle photo upload
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          fontSize: '14px',
                          color: '#0F1629',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F4F6FB')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <IcCamera size={18} color="#6B7280" />
                        <span>{t('nav.take_photo')}</span>
                      </button>

                      <div style={{ height: '1px', background: '#E3E7F0', margin: '4px 0' }} />

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                          navigate('/login');
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontSize: '14px',
                          color: '#0F1629',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2';
                          (e.currentTarget as HTMLButtonElement).style.color = '#DC2626';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color = '#0F1629';
                        }}
                      >
                        <IcLogout size={18} color="currentColor" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px', background: '#EDF0F8' }}>
        <Outlet />
      </main>
    </div>
  );
}

export function StudentGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
}

export function AdminGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/student/dashboard" replace />;
  return <Outlet />;
}