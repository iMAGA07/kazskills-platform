import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../context/UsersContext';
import { IcBook, IcFileText, IcBell, IcCamera, IcLogout, IcDocument } from '../Icons';
import { useLanguage } from '../../context/LanguageContext';
import { getOrganizationName, getCurrentOrganization, useOrganizations } from '../../lib/organization';
import { PhotoCaptureModal } from '../shared/PhotoCaptureModal';
import { useViewport } from '../../lib/useViewport';
import { LOGO_DATA_URL } from '../../assets/logo';

// Logo component — uses the tenant org logo on subdomains, KAZSKILLS on the root.
// Click → user's home page (role-aware).
const Logo = () => {
  // Subscribe to the registry so the header updates as soon as the admin
  // uploads or changes a logo (no F5 needed).
  useOrganizations();
  const org = getCurrentOrganization();
  const { user } = useAuth();
  const nav = useNavigate();
  const goHome = () => {
    nav(user?.role === 'admin' ? '/admin/dashboard' : '/student/courses');
  };

  const wrap = (content: React.ReactNode) => (
    <button
      onClick={goHome}
      title="На главную"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      {content}
    </button>
  );

  if (org?.logoUrl) {
    return wrap(
      <>
        <img
          src={org.logoUrl} alt={org.displayName}
          style={{ height: 40, maxWidth: 140, objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3D84', lineHeight: 1.1, letterSpacing: '0.3px' }}>
            {org.displayName}
          </div>
          <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.4, letterSpacing: '0.3px' }}>
            ОБУЧАЮЩАЯ ПЛАТФОРМА
          </div>
        </div>
      </>
    );
  }

  return wrap(
    <>
      <img
        src={LOGO_DATA_URL} alt="KAZSKILLS"
        width={40} height={40}
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#fff', flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1B3D84', lineHeight: 1, letterSpacing: '0.5px' }}>
          {org?.displayName?.toUpperCase() ?? 'KAZSKILLS'}
        </div>
        <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.4, letterSpacing: '0.3px' }}>
          ОБУЧАЮЩАЯ ПЛАТФОРМА
        </div>
      </div>
    </>
  );
};

export function AppLayout() {
  const { user, logout, updateUser: updateLocalUser } = useAuth();
  const { updateUser: updateServerUser } = useUsers();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useViewport();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const orgName = getOrganizationName();

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
          height: isMobile ? 56 : 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 24px',
          gap: isMobile ? 10 : 32,
        }}>
          {/* Left: Logo + Nav */}
          <div className="app-header-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 32,
            flex: 1,
            minWidth: 0,
          }}>
            <Logo />
            {orgName && !isMobile && (
              <div style={{
                padding: '4px 12px',
                borderRadius: '999px',
                background: '#1B3D84',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {orgName}
              </div>
            )}

            {/* Navigation tabs — icon-only on mobile so they don't push the
                avatar off-screen on narrow viewports (text was getting clipped
                to e.g. "Докумен"). */}
            {isStudent && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('/student/courses')}
                  title="Курсы"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: isMobile ? '9px' : '10px 16px',
                    width: isMobile ? 38 : undefined,
                    height: isMobile ? 38 : undefined,
                    justifyContent: 'center',
                    background: isActive('/student/courses') ? '#EBF1FE' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive('/student/courses') ? '#2B5CE6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <IcBook size={isMobile ? 18 : 16} color="currentColor" />
                  {!isMobile && <span>{t('nav.my_courses')}</span>}
                </button>

                <button
                  onClick={() => navigate('/student/documents')}
                  title="Документы"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: isMobile ? '9px' : '10px 16px',
                    width: isMobile ? 38 : undefined,
                    height: isMobile ? 38 : undefined,
                    justifyContent: 'center',
                    background: isActive('/student/documents') ? '#EBF1FE' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive('/student/documents') ? '#2B5CE6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <IcFileText size={isMobile ? 18 : 16} color="currentColor" />
                  {!isMobile && <span>{t('nav.documents')}</span>}
                </button>

                <button
                  onClick={() => navigate('/student/certificates')}
                  title="Протоколы"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: isMobile ? '9px' : '10px 16px',
                    width: isMobile ? 38 : undefined, height: isMobile ? 38 : undefined,
                    justifyContent: 'center',
                    background: isActive('/student/certificates') ? '#EBF1FE' : 'transparent',
                    border: 'none', borderRadius: '8px',
                    color: isActive('/student/certificates') ? '#2B5CE6' : '#6B7280',
                    cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <IcDocument size={isMobile ? 18 : 16} color="currentColor" />
                  {!isMobile && <span>Протоколы</span>}
                </button>
              </div>
            )}
          </div>

          {/* Right: Language + Bell + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
            {!isMobile && <LanguageSwitcher variant="light" />}

            {/* Bell — hidden on mobile to save space */}
            {!isMobile && (
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
            )}

            {/* Avatar with dropdown — shows the user's uploaded photo if any,
                otherwise the first letter of their name on a gradient. */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowProfileMenu(v => !v)}
                style={{
                  width: 36, height: 36, borderRadius: '9px',
                  background: user.avatar
                    ? '#fff'
                    : 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                  border: user.avatar ? '1.5px solid #BFDBFE' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#fff',
                  cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
                }}
              >
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user.name.charAt(0)
                }
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
                    width: isMobile ? 'calc(100vw - 24px)' : '320px',
                    maxWidth: isMobile ? 'calc(100vw - 24px)' : 'none',
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
                          setPhotoOpen(true);
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
                          const wasAdmin = user?.role === 'admin';
                          setShowProfileMenu(false);
                          logout();
                          navigate(wasAdmin ? '/internal-access' : '/login');
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
      <main className="app-main" style={{ flex: 1, overflowY: 'auto', padding: '28px', background: '#EDF0F8' }}>
        <BackBar />
        <Outlet />
      </main>

      <PhotoCaptureModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onSaved={(url) => {
          updateLocalUser({ avatar: url });
          if (user) updateServerUser(user.id, { avatar: url });
        }}
        title="Фото профиля"
        hint="Используется на ваших сертификатах."
      />
    </div>
  );
}

// ─── Back button bar ─────────────────────────────────────────────────────────
// Shown on every inner page. Hidden on the role's "home tabs" — the user is
// already at a top-level route, no point in offering Back to login.
const HOME_PATHS = new Set<string>([
  '/student/courses',
  '/student/dashboard',
  '/student/documents',
  '/student/certificates',
  '/admin/dashboard',
  '/admin/courses',
  '/admin/users',
  '/admin/analytics',
]);

function BackBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (HOME_PATHS.has(location.pathname)) return null;

  const handleBack = () => {
    // Prefer real browser history when available, otherwise fall back to home.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/courses');
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={handleBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 999,
          border: '1.5px solid #E3E7F0', background: '#fff',
          color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B5CE6';
          (e.currentTarget as HTMLButtonElement).style.color = '#2B5CE6';
          (e.currentTarget as HTMLButtonElement).style.background = '#EBF1FE';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
          (e.currentTarget as HTMLButtonElement).style.color = '#374151';
          (e.currentTarget as HTMLButtonElement).style.background = '#fff';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Назад
      </button>
    </div>
  );
}

function homeForRole(role: string): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'representative') return '/rep';
  return '/student/courses';
}

export function StudentGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}

export function AdminGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/internal-access" replace />;
  // Representatives are NOT admins — they get the restricted cabinet only.
  if (user.role !== 'admin') return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}