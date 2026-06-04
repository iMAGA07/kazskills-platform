import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher';
import { Logo } from '../components/shared/Logo';
import { IcEye, IcClose, IcShield, IcWarning, IcLock, IcMail } from '../components/Icons';
import { getOrganizationName } from '../lib/organization';
import { InstructionModal } from '../components/shared/InstructionModal';

const NAVY = '#1B3D84';
const BLUE = '#2B5CE6';

interface LoginPageProps {
  /** Which audience this login page is for. Wrong-role logins are rejected.
      'admin' mode (the /internal-access entrance) also accepts representatives. */
  mode: UserRole;
}

export default function LoginPage({ mode }: LoginPageProps) {
  const orgName = getOrganizationName();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showInstr, setShowInstr] = useState(false);

  const { login, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      const role = result.role;
      // The staff entrance (mode==='admin' at /internal-access) accepts both
      // admins and client representatives; the student page only students.
      const allowed =
        role === mode ||
        (mode === 'admin' && role === 'representative');
      if (!allowed) {
        logout();
        setError(t('auth.error'));
        return;
      }
      navigate(
        role === 'admin' ? '/admin/dashboard'
        : role === 'representative' ? '/rep'
        : '/student/courses'
      );
    } else if (result.reason === 'wrong_tenant') {
      setError(orgName
        ? `Эта учётная запись не относится к организации ${orgName}`
        : 'Учётная запись не относится к этой организации');
    } else {
      setError(t('auth.error'));
    }
  };

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '9px',
    border: '1.5px solid #E3E7F0',
    background: '#F8FAFD',
    color: '#0F1629',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#EDF0F8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '60px',
        background: NAVY,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 10,
      }}>
        <Logo size="sm" variant="full" onDark />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <IcShield size={12} color="rgba(255,255,255,0.4)" />
            Образовательная онлайн-платформа
          </span>
          <LanguageSwitcher variant="dark" />
        </div>
      </div>

      {/* Form card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 32px rgba(27,61,132,0.12)',
        padding: '40px 36px',
        marginTop: '60px',
      }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {orgName && (
            <div style={{
              display: 'inline-block',
              marginBottom: '14px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: NAVY,
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {orgName}
            </div>
          )}
          <h2 style={{ margin: '0 0 6px', color: '#0F1629', fontSize: '22px' }}>
            {t('auth.login')}
          </h2>
          <p style={{ color: '#6B7280', fontSize: '13.5px', margin: 0 }}>
            {t('auth.subtitle')}
          </p>

          {/* Welcome block */}
          <div style={{
            marginTop: '16px',
            background: '#F4F7FF',
            border: '1px solid #D6E0FF',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '12.5px', fontWeight: 700, color: '#1B3D84', lineHeight: 1.4 }}>
              Добро пожаловать на образовательную онлайн-платформу KAZSKILLS!
            </p>
            <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#4B5563', lineHeight: 1.6 }}>
              Здесь вы можете изучать учебные материалы, проходить тестирование и отслеживать свой прогресс в удобное для вас время.
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#2B5CE6', fontWeight: 500 }}>
              Желаем вам успешного прохождения курсов и продуктивного обучения!
            </p>
          </div>
        </div>

        {/* Mode indicator (read-only) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: mode === 'admin' ? '#0F1629' : '#EBF1FE',
          color: mode === 'admin' ? '#fff' : NAVY,
          borderRadius: '10px', padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '13px', fontWeight: 600,
        }}>
          {mode === 'admin' ? <IcShield size={14} color="#fff" /> : <IcMail size={14} color={NAVY} />}
          {mode === 'admin' ? 'Вход для администраторов' : 'Вход для слушателей'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Login (email OR generated numeric login) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', color: '#374151', fontSize: '12.5px', fontWeight: 500 }}>
              <IcMail size={13} color="#9CA3AF" />
              Логин
            </label>
            <input
              // type="text" (not "email"): batch-created users get a 6-digit
              // numeric login like 190408, the browser's HTML5 email-validator
              // would otherwise block submit before our code sees it.
              type="text"
              autoComplete="username"
              inputMode="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email или 6-значный логин"
              required
              style={{ ...inp, borderColor: error ? '#DC2626' : '#E3E7F0' }}
              onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(43,92,230,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = error ? '#DC2626' : '#E3E7F0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', color: '#374151', fontSize: '12.5px', fontWeight: 500 }}>
              <IcLock size={13} color="#9CA3AF" />
              {t('auth.password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...inp, paddingRight: '42px', borderColor: error ? '#DC2626' : '#E3E7F0' }}
                onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(43,92,230,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = error ? '#DC2626' : '#E3E7F0'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '2px',
                }}
              >
                {showPass ? <IcClose size={15} color="#9CA3AF" /> : <IcEye size={15} color="#9CA3AF" />}
              </button>
            </div>
          </div>

          {/* Forgot */}
          <div style={{ textAlign: 'right', marginTop: '-6px' }}>
            <button type="button" style={{ background: 'none', border: 'none', color: BLUE, fontSize: '12.5px', cursor: 'pointer' }}>
              {t('auth.forgot')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px',
              background: '#FEF2F2', border: '1px solid #FECACA',
            }}>
              <IcWarning size={14} color="#DC2626" />
              <span style={{ fontSize: '13px', color: '#DC2626' }}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px', borderRadius: '9px',
              background: loading ? '#E3E7F0' : NAVY,
              border: 'none',
              color: loading ? '#9CA3AF' : '#fff',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(27,61,132,0.3)',
              marginTop: '4px',
              letterSpacing: '0.02em',
            }}
          >
            {loading ? t('auth.logging_in') : t('auth.login')}
          </button>
        </form>

        {/* Cross-link is shown ONLY on the admin portal — in case an admin opens
            it by mistake on the wrong machine and needs to bail out to the
            public student login. The student page intentionally does NOT
            advertise an admin entrance. */}
        {mode === 'admin' && (
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #EEF1F8', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '999px',
                background: '#F4F6FB', border: '1.5px solid #E3E7F0',
                color: NAVY, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#EBF1FE';
                (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F4F6FB';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0';
              }}
            >
              ← Перейти на страницу слушателя
            </button>
          </div>
        )}
      </div>

      {/* Instruction button (students only — staff don't need it) */}
      {mode === 'student' && (
        <button
          type="button"
          onClick={() => setShowInstr(true)}
          style={{
            marginTop: '18px',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 999,
            background: '#fff', border: '1.5px solid #D6E0FF',
            color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(27,61,132,0.08)',
          }}
        >
          📘 Краткая инструкция по платформе
        </button>
      )}

      {/* Footer */}
      <p style={{ marginTop: '16px', fontSize: '11.5px', color: '#9CA3AF', textAlign: 'center' }}>
        © 2025 Kazskills · kazskills.kz
      </p>

      <InstructionModal open={showInstr} onClose={() => setShowInstr(false)} />
    </div>
  );
}