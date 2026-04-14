import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  IcDashboard, IcBook, IcMedal, IcPerson, IcFileText,
  IcTeam, IcGraph, IcLogout, IcPlus, IcChevronLeft, IcChevronRight, IcShield
} from '../Icons';
import { Logo } from '../shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface NavItem {
  key: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const NAV: NavItem[] = [
  { key: 'nav.my_courses',   icon: IcBook,     path: '/student/courses',       roles: ['student'] },
  { key: 'nav.documents',    icon: IcFileText, path: '/student/documents',     roles: ['student'] },
  { key: 'admin.dashboard',  icon: IcDashboard, path: '/admin/dashboard',       roles: ['admin'] },
  { key: 'admin.courses',    icon: IcBook,      path: '/admin/courses',         roles: ['admin'] },
  { key: 'admin.users',      icon: IcTeam,      path: '/admin/users',           roles: ['admin'] },
  { key: 'admin.analytics',  icon: IcGraph,     path: '/admin/analytics',       roles: ['admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV.filter(i => i.roles.includes(user?.role ?? ''));
  const isActive = (path: string) =>
    location.pathname === path ||
    location.pathname.startsWith(path + '/') ||
    (path === '/student/courses' && location.pathname.startsWith('/student/dashboard'));

  return (
    <div style={{
      width: collapsed ? '68px' : '244px',
      minWidth: collapsed ? '68px' : '244px',
      background: '#172035',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s ease, min-width 0.22s ease',
      position: 'relative',
      zIndex: 10,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 68,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 0 0 19px' : '0 0 0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {collapsed
          ? <Logo size="sm" variant="icon" onDark />
          : <Logo size="sm" variant="full" onDark />
        }
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Развернуть' : 'Свернуть'}
        style={{
          position: 'absolute',
          top: '52px',
          right: '-28px',
          width: '28px',
          height: '52px',
          borderRadius: '0 10px 10px 0',
          background: '#2B5CE6',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
          boxShadow: '4px 0 12px rgba(43,92,230,0.25)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1B3D84')}
        onMouseLeave={e => (e.currentTarget.style.background = '#2B5CE6')}
      >
        {collapsed
          ? <IcChevronRight size={13} color="#fff" />
          : <IcChevronLeft size={13} color="#fff" />
        }
      </button>

      {/* Quick create for admin */}
      {user?.role === 'admin' && !collapsed && (
        <div style={{ padding: '14px 14px 8px' }}>
          <button
            onClick={() => navigate('/admin/courses/new')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 2px 12px rgba(43,92,230,0.35)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <IcPlus size={15} color="#fff" />
            {t('admin.create_course')}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map(item => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              title={collapsed ? t(item.key) : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(43,92,230,0.22)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? '#fff' : 'rgba(255,255,255,0.42)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontSize: '13.5px',
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.42)';
                }
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '4px',
                  bottom: '4px',
                  width: '3px',
                  borderRadius: '0 2px 2px 0',
                  background: '#2B5CE6',
                }} />
              )}
              <Icon size={17} color={active ? '#fff' : 'rgba(255,255,255,0.42)'} />
              {!collapsed && <span>{t(item.key)}</span>}
            </button>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {!collapsed && user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            marginBottom: '6px',
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {user.name.charAt(0)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user.name.split(' ').slice(0, 2).join(' ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <IcShield size={10} color="#2B5CE6" />
                <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)' }}>
                  {user.role === 'admin' ? 'Администратор' : 'Слушатель'}
                </span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          title={collapsed ? t('nav.logout') : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            borderRadius: '8px',
            fontSize: '13px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
          }}
        >
          <IcLogout size={16} color="currentColor" />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </div>
  );
}