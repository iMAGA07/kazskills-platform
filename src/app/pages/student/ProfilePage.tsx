import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import {
  IcPerson, IcMail, IcPhone, IcBuilding, IcBriefcase,
  IcShield, IcSave, IcCheckCircle, IcMedal, IcBook, IcClock
} from '../../components/Icons';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: '8px',
  border: '1.5px solid #E3E7F0', background: '#F8FAFD',
  color: '#0F1629', fontSize: '13.5px', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const { courses, getProgress } = useCourses();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', department: user?.department ?? '', position: user?.position ?? '' });
  const [saved, setSaved] = useState(false);
  const [progressList, setProgressList] = useState<UserProgress[]>([]);

  useEffect(() => {
    if (!user || courses.length === 0) return;
    Promise.all(courses.filter(c => c.published).map(c => getProgress(user.id, c.id)))
      .then(ps => setProgressList(ps.filter(Boolean)))
      .catch(console.error);
  }, [user, courses]);

  if (!user) return null;

  const completed = progressList.filter(p => p.status === 'completed').length;
  const inProgress = progressList.filter(p => p.status === 'in_progress').length;
  const totalAttempts = progressList.reduce((s, p) => s + (p.attempts?.length || 0), 0);
  const certsCount = completed;

  const handleSave = () => {
    updateUser(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const STATS = [
    { icon: IcBook, val: inProgress, label: 'В процессе', color: '#2B5CE6', bg: '#EBF1FE' },
    { icon: IcCheckCircle, val: completed, label: 'Завершено', color: '#059669', bg: '#ECFDF5' },
    { icon: IcMedal, val: certsCount, label: 'Сертификатов', color: '#D97706', bg: '#FFFBEB' },
    { icon: IcClock, val: totalAttempts, label: 'Попыток тестов', color: '#7C3AED', bg: '#F5F3FF' },
  ];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>{t('profile.title')}</h1>
        <p style={{ color: '#6B7280', margin: 0, fontSize: '13.5px' }}>Управление личными данными и просмотр статистики</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar card */}
          <div style={{
            background: '#fff', borderRadius: '14px', padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: '20px',
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 style={{ margin: '0 0 3px', color: '#0F1629' }}>{(() => { const p = user.name.trim().split(/\s+/); return p.length >= 3 ? `${p[0]} ${p[1]}` : user.name; })()}</h3>
              <p style={{ margin: '0 0 10px', color: '#6B7280', fontSize: '13.5px' }}>{user.email}</p>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                  background: user.role === 'admin' ? '#EBF1FE' : '#ECFDF5',
                  color: user.role === 'admin' ? '#2B5CE6' : '#059669',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <IcShield size={10} color="currentColor" />
                  {user.role === 'admin' ? 'Администратор' : 'Слушатель'}
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
                  background: '#FFFBEB', color: '#D97706',
                }}>
                  Kazskills
                </span>
              </div>
            </div>
          </div>

          {/* Personal info form */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 20px', color: '#0F1629' }}>{t('profile.personal')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: t('profile.name'), key: 'name', icon: IcPerson, type: 'text' },
                { label: t('profile.phone'), key: 'phone', icon: IcPhone, type: 'tel' },
                { label: t('profile.department'), key: 'department', icon: IcBuilding, type: 'text' },
                { label: t('profile.position'), key: 'position', icon: IcBriefcase, type: 'text' },
              ].map(({ label, key, icon: Icon, type }) => (
                <div key={key}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', color: '#374151', fontSize: '12.5px' }}>
                    <Icon size={13} color="#9CA3AF" /> {label}
                  </label>
                  <input
                    type={type}
                    value={key === 'name' ? (form[key as keyof typeof form] as string).trim().split(/\s+/).slice(0, 2).join(' ') : form[key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inp}
                    onFocus={e => { e.target.style.borderColor = '#2B5CE6'; e.target.style.boxShadow = '0 0 0 3px rgba(43,92,230,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#E3E7F0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              ))}
              {/* Read-only fields */}
              {[
                { label: t('profile.email'), val: user.email, icon: IcMail },
                { label: t('profile.organization'), val: user.organization, icon: IcBuilding },
              ].map(({ label, val, icon: Icon }) => (
                <div key={label}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', color: '#374151', fontSize: '12.5px' }}>
                    <Icon size={13} color="#9CA3AF" /> {label}
                  </label>
                  <input type="text" value={val} disabled style={{ ...inp, opacity: 0.6, cursor: 'not-allowed', background: '#F4F6FB' }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F0F2F8' }}>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: saved ? '#ECFDF5' : 'linear-gradient(135deg, #2B5CE6, #5B4EF0)',
                  color: saved ? '#059669' : '#fff',
                  cursor: 'pointer', fontSize: '13.5px', fontWeight: 600,
                  transition: 'all 0.2s',
                  boxShadow: saved ? 'none' : '0 2px 10px rgba(43,92,230,0.3)',
                }}
              >
                {saved ? <IcCheckCircle size={15} color="#059669" /> : <IcSave size={15} color="#fff" />}
                {saved ? t('profile.saved') : t('profile.save')}
              </button>
            </div>
          </div>

          {/* Password */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 16px', color: '#0F1629', fontSize: '15px' }}>{t('profile.change_password')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {['Текущий пароль', 'Новый пароль', 'Подтверждение'].map(l => (
                <div key={l}>
                  <label style={{ display: 'block', marginBottom: '7px', color: '#374151', fontSize: '12.5px' }}>{l}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    style={inp}
                    onFocus={e => { e.target.style.borderColor = '#2B5CE6'; e.target.style.boxShadow = '0 0 0 3px rgba(43,92,230,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#E3E7F0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              ))}
            </div>
            <button
              style={{
                marginTop: '16px', padding: '9px 18px',
                borderRadius: '8px', border: '1.5px solid #E3E7F0',
                background: 'transparent', color: '#374151',
                cursor: 'pointer', fontSize: '13.5px', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B5CE6'; (e.currentTarget as HTMLButtonElement).style.color = '#2B5CE6'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            >
              Сохранить пароль
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stats */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 16px', color: '#0F1629', fontSize: '14px' }}>{t('profile.stats')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STATS.map(({ icon: Icon, val, label, color, bg }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '9px',
                  background: '#EBF1FE', border: '1px solid #BFDBFE',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '8px',
                    background: '#DBEAFE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={17} color="#2B5CE6" />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1B3D84', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
              <IcShield size={16} color="#059669" />
              <h4 style={{ margin: 0, color: '#0F1629', fontSize: '14px' }}>Настройки аккаунта</h4>
            </div>
            {[
              { label: '2FA аутентификация', on: false },
              { label: 'Уведомления на email', on: true },
              { label: 'Контроль через камеру', on: true },
            ].map(({ label, on }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid #F3F4F6',
              }}>
                <span style={{ fontSize: '13px', color: '#374151' }}>{label}</span>
                <span style={{
                  fontSize: '11.5px', fontWeight: 600,
                  color: on ? '#059669' : '#9CA3AF',
                }}>
                  {on ? '● Включено' : '○ Выкл.'}
                </span>
              </div>
            ))}
          </div>

          {/* Company info */}
          <div style={{
            background: '#EBF1FE', borderRadius: '12px', padding: '16px 18px',
            border: '1px solid #BFDBFE',
          }}>
            <p style={{ margin: '0 0 3px', fontSize: '11.5px', color: '#6B7280' }}>Организация</p>
            <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#1E40AF' }}>Kazskills</p>
            <p style={{ margin: '0 0 3px', fontSize: '11.5px', color: '#6B7280' }}>БИН</p>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#2B5CE6', fontFamily: 'monospace' }}>180240012345</p>
          </div>
        </div>
      </div>
    </div>
  );
}