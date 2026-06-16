import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUsers, type ManagedUser } from '../../context/UsersContext';
import { useCourses, sortCourses } from '../../context/CoursesContext';
import { getCurrentOrganization, useOrganizations } from '../../lib/organization';
import { CourseAssignPicker } from '../../components/shared/CourseAssignPicker';
import { downloadProtocol, protocolTypeForCourse, protocolTypeLabel } from '../../lib/protocol';
import {
  IcSearch, IcFilter, IcUserPlus, IcPerson, IcShield, IcTeam,
  IcBook, IcMedal, IcEdit, IcTrash, IcClose, IcBuilding,
  IcCheck, IcSortAsc, IcSortDesc, IcChevronDown, IcMail,
  IcPhone, IcBriefcase, IcLock, IcMore, IcCheckCircle, IcWarning,
  IcDocument, IcDownload, IcClock, IcXCircle, IcTarget, IcRefresh,
} from '../../components/Icons';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
type SortKey = 'name' | 'organization' | 'department' | 'role' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

interface FormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'student' | 'representative';
  organization: string;
  department: string;
  position: string;
  phone: string;
  status: 'active' | 'blocked';
  assignedCourses: string[];
}

const EMPTY_FORM: FormData = {
  name: '', email: '', password: '', role: 'student',
  organization: '', department: '', position: '', phone: '', status: 'active',
  assignedCourses: [],
};

// Auto-generate a 6-digit login and 4-digit password (same style as batch).
function genLogin6() { return String(Math.floor(100000 + Math.random() * 900000)); }
function genPassword4() { return String(Math.floor(1000 + Math.random() * 9000)); }

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  representative: { label: 'Представитель', color: '#B45309', bg: '#FEF3C7' },
  admin:   { label: 'Администратор', color: '#2B5CE6', bg: '#EBF1FE' },
  student: { label: 'Студент',       color: '#374151', bg: '#F4F6FB' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Активен',      color: '#2B5CE6', bg: '#EBF1FE' },
  blocked: { label: 'Заблокирован', color: '#6B7280', bg: '#F4F6FB' },
};

const AVATAR_COLORS = [
  ['#1B3D84', '#2B5CE6'],
  ['#2B5CE6', '#1B3D84'],
  ['#1B3D84', '#163272'],
  ['#163272', '#2B5CE6'],
  ['#1E4FA0', '#1B3D84'],
  ['#2450CC', '#1B3D84'],
];

const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];

// ────────────────────────────────────────────────
// Input field component
// ────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1.5px solid #E3E7F0', background: '#fff',
  fontSize: '13.5px', color: '#0F1629', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
};

// ────────────────────────────────────────────────
// Dropdown component
// ────────────────────────────────────────────────
function Dropdown({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: '32px' }}
        onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
        onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <IcChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// ────────────────────────────────────────────────
// Modal component
// ────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15, 22, 41, 0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// Delete Confirm Modal
// ────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel }: {
  user: ManagedUser;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [colors] = useState(() => getAvatarColor(user.id));
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '32px',
      width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
          background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IcTrash size={22} color="#DC2626" />
        </div>
        <h3 style={{ margin: '0 0 8px', color: '#0F1629', fontSize: '17px' }}>Удалить пользователя?</h3>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '13.5px', lineHeight: '1.5' }}>
          Вы собираетесь удалить <strong style={{ color: '#0F1629' }}>{user.name}</strong>.
          Это действие нельзя отменить.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px', borderRadius: '9px',
            border: '1.5px solid #E3E7F0', background: '#fff',
            color: '#374151', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Отмена
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '10px', borderRadius: '9px',
            border: 'none', background: '#DC2626',
            color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// User Form Modal
// ────────────────────────────────────────────────
function UserFormModal({ open, onClose, editUser, organizations }: {
  open: boolean;
  onClose: () => void;
  editUser: ManagedUser | null;
  organizations: string[];
}) {
  const { addUser, updateUser } = useUsers();
  const { courses } = useCourses();
  const publishedCourses = sortCourses(courses.filter(c => c.published));
  const tenantOrg = getCurrentOrganization();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPass, setShowPass] = useState(false);
  const [customOrg, setCustomOrg] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      if (editUser) {
        setForm({
          name: editUser.name,
          email: editUser.email,
          password: editUser.password,
          role: editUser.role,
          organization: editUser.organization,
          department: editUser.department ?? '',
          position: editUser.position ?? '',
          phone: editUser.phone ?? '',
          status: editUser.status,
          assignedCourses: editUser.enrolledCourses ?? [],
        });
        setCustomOrg(!organizations.includes(editUser.organization));
      } else {
        setForm({
          ...EMPTY_FORM,
          // Prefill a ready-to-use login + password so the admin never gets
          // stuck on "what do I put here" — they can overwrite if they want.
          email: genLogin6(),
          password: genPassword4(),
          // On a tenant subdomain, auto-bind the new user to that org.
          organization: tenantOrg ? tenantOrg.fullName : '',
        });
        setCustomOrg(false);
      }
      setErrors({});
      setSuccess(false);
    }
  }, [open, editUser]);

  const set = (key: keyof FormData, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Обязательное поле';
    // Login (stored in `email`) is required but is prefilled, so this never
    // blocks the admin. Email format is NOT enforced — a numeric login like
    // "190408" is valid (matches the batch-created accounts).
    if (!form.email.trim()) e.email = 'Введите логин (email или номер)';
    if (!editUser && !form.password.trim()) e.password = 'Обязательное поле';
    if (!form.organization.trim()) e.organization = 'Обязательное поле';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleCourse = (courseId: string) => {
    setForm(prev => ({
      ...prev,
      assignedCourses: prev.assignedCourses.includes(courseId)
        ? prev.assignedCourses.filter(id => id !== courseId)
        : [...prev.assignedCourses, courseId],
    }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editUser) {
      updateUser(editUser.id, {
        name: form.name, email: form.email, password: form.password,
        role: form.role, organization: form.organization,
        department: form.department, position: form.position,
        phone: form.phone, status: form.status,
        enrolledCourses: form.assignedCourses,
      });
    } else {
      addUser({
        name: form.name, email: form.email, password: form.password,
        role: form.role, organization: form.organization,
        department: form.department, position: form.position,
        phone: form.phone, status: form.status,
        enrolledCourses: form.assignedCourses,
      });
    }
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1000);
  };

  const orgOptions = [
    ...organizations.map(o => ({ value: o, label: o })),
    { value: '__custom__', label: '+ Новая организация...' },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{
        background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '560px',
        boxShadow: '0 24px 72px rgba(0,0,0,0.14)', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px 18px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcUserPlus size={20} color="#2B5CE6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#0F1629' }}>
                {editUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                {editUser ? 'Изменение данных учётной записи' : 'Создание новой учётной записи'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '8px', border: '1px solid #E3E7F0',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <IcCheckCircle size={28} color="#059669" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#059669', margin: 0 }}>
                {editUser ? 'Данные обновлены!' : 'Пользователь добавлен!'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Section: Личные данные */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                Личные данные
              </div>

              <Field label="Полное имя (ФИО)" required>
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  style={{ ...inputStyle, borderColor: errors.name ? '#DC2626' : '#E3E7F0' }}
                  onFocus={e => (e.target.style.borderColor = errors.name ? '#DC2626' : '#2B5CE6')}
                  onBlur={e => (e.target.style.borderColor = errors.name ? '#DC2626' : '#E3E7F0')}
                />
                {errors.name && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.name}</span>}
              </Field>

              {/* Credentials: login + password. Both prefilled with generated
                  values so the admin can just submit. Login accepts email OR
                  a number. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <Field label="Логин (email или номер)" required>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="напр. 190408 или user@company.kz"
                      style={{ ...inputStyle, flex: 1, borderColor: errors.email ? '#DC2626' : '#E3E7F0' }}
                      onFocus={e => (e.target.style.borderColor = errors.email ? '#DC2626' : '#2B5CE6')}
                      onBlur={e => (e.target.style.borderColor = errors.email ? '#DC2626' : '#E3E7F0')}
                    />
                    {!editUser && (
                      <button type="button" onClick={() => set('email', genLogin6())} title="Сгенерировать логин"
                        style={{ flexShrink: 0, width: 38, borderRadius: 8, border: '1.5px solid #E3E7F0', background: '#F8FAFD', cursor: 'pointer', fontSize: 15 }}>↻</button>
                    )}
                  </div>
                  {errors.email && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.email}</span>}
                </Field>
                <Field label="Телефон (необязательно)">
                  <input
                    value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+7 (700) 000-00-00"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
                    onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
                  />
                </Field>
              </div>

              <Field label={editUser ? 'Пароль (оставьте как есть для сохранения)' : 'Пароль'} required={!editUser}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder="Пароль"
                      style={{ ...inputStyle, paddingRight: '40px', borderColor: errors.password ? '#DC2626' : '#E3E7F0' }}
                      onFocus={e => (e.target.style.borderColor = errors.password ? '#DC2626' : '#2B5CE6')}
                      onBlur={e => (e.target.style.borderColor = errors.password ? '#DC2626' : '#E3E7F0')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      }}
                    >
                      <IcLock size={14} color={showPass ? '#2B5CE6' : '#9CA3AF'} />
                    </button>
                  </div>
                  {!editUser && (
                    <button type="button" onClick={() => set('password', genPassword4())} title="Сгенерировать пароль"
                      style={{ flexShrink: 0, width: 38, borderRadius: 8, border: '1.5px solid #E3E7F0', background: '#F8FAFD', cursor: 'pointer', fontSize: 15 }}>↻</button>
                  )}
                </div>
                {errors.password && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.password}</span>}
              </Field>

              {/* Section: Роль и статус */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px', marginBottom: '2px' }}>
                Роль и статус
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <Field label="Роль" required>
                  <Dropdown
                    value={form.role}
                    onChange={v => set('role', v)}
                    options={[
                      { value: 'student', label: 'Слушатель' },
                      { value: 'representative', label: 'Представитель заказчика' },
                      { value: 'admin', label: 'Администратор' },
                    ]}
                  />
                </Field>
                <Field label="Статус">
                  <Dropdown
                    value={form.status}
                    onChange={v => set('status', v)}
                    options={[
                      { value: 'active', label: 'Активен' },
                      { value: 'blocked', label: 'Заблокирован' },
                    ]}
                  />
                </Field>
              </div>

              {/* Section: Организация */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px', marginBottom: '2px' }}>
                Организация
              </div>

              <Field label="Компания" required>
                {tenantOrg ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '8px',
                    background: '#EBF1FE', border: '1.5px solid #D6E0FF',
                  }}>
                    <IcBuilding size={15} color="#2B5CE6" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1B3D84' }}>
                        {tenantOrg.fullName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        Привязано к поддомену {tenantOrg.slug}.kazskills.kz
                      </div>
                    </div>
                  </div>
                ) : customOrg ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={form.organization} onChange={e => set('organization', e.target.value)}
                      placeholder="Название организации"
                      style={{ ...inputStyle, flex: 1, borderColor: errors.organization ? '#DC2626' : '#E3E7F0' }}
                      onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
                      onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
                    />
                    <button
                      onClick={() => { setCustomOrg(false); set('organization', ''); }}
                      style={{
                        padding: '0 12px', borderRadius: '8px', border: '1.5px solid #E3E7F0',
                        background: '#F8FAFD', cursor: 'pointer', fontSize: '12px', color: '#6B7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Из списка
                    </button>
                  </div>
                ) : (
                  <Dropdown
                    value={form.organization || ''}
                    onChange={v => {
                      if (v === '__custom__') { setCustomOrg(true); set('organization', ''); }
                      else set('organization', v);
                    }}
                    options={[
                      { value: '', label: '— Выберите организацию —' },
                      ...orgOptions.filter(o => o.value !== '__custom__'),
                      { value: '__custom__', label: '+ Новая организация...' },
                    ]}
                  />
                )}
                {errors.organization && !tenantOrg && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.organization}</span>}
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <Field label="Отдел">
                  <input
                    value={form.department} onChange={e => set('department', e.target.value)}
                    placeholder="Производственный отдел"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
                    onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
                  />
                </Field>
                <Field label="Должность">
                  <input
                    value={form.position} onChange={e => set('position', e.target.value)}
                    placeholder="Инженер по ОТ"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
                    onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
                  />
                </Field>
              </div>

              {/* Section: Назначить курсы — selected rise to top, drag to reorder */}
              {publishedCourses.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px', marginBottom: '6px' }}>
                    Назначить курсы
                  </div>
                  <CourseAssignPicker
                    courses={publishedCourses}
                    value={form.assignedCourses}
                    onChange={ids => setForm(f => ({ ...f, assignedCourses: ids }))}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #F3F4F6',
            display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0,
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: '9px', border: '1.5px solid #E3E7F0',
                background: '#fff', color: '#374151', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '9px 24px', borderRadius: '9px', border: 'none',
                background: '#2B5CE6', color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <IcCheck size={14} color="#fff" />
              {editUser ? 'Сохранить изменения' : 'Добавить пользователя'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ────────────────────────────────────────────────
// Row action menu
// ────────────────────────────────────────────────
function RowMenu({ user, onDetails, onEdit, onDelete, onToggleStatus, onProtocols }: {
  user: ManagedUser;
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onProtocols: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = [
    { icon: <IcPerson size={14} color="#2B5CE6" />, label: 'Подробнее', action: onDetails, danger: false },
    { icon: <IcEdit size={14} color="#374151" />, label: 'Редактировать', action: onEdit, danger: false },
    { icon: <IcDocument size={14} color="#2B5CE6" />, label: 'Протоколы', action: onProtocols, danger: false },
    {
      icon: user.status === 'active' ? <IcLock size={14} color="#6B7280" /> : <IcCheckCircle size={14} color="#2B5CE6" />,
      label: user.status === 'active' ? 'Заблокировать' : 'Разблокировать',
      action: onToggleStatus, danger: false,
    },
    { icon: <IcTrash size={14} color="#DC2626" />, label: 'Удалить', action: onDelete, danger: true },
  ];

  // Open as a fixed-position portal so the menu is never clipped by the table's
  // overflow container, and flip upward when there isn't room below.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const estH = items.length * 38 + 12;
    const flipUp = window.innerHeight - r.bottom < estH && r.top > estH;
    setCoords({
      right: Math.max(8, window.innerWidth - r.right),
      ...(flipUp ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          width: 30, height: 30, borderRadius: '7px', background: open ? '#EBF1FE' : 'transparent',
          border: `1px solid ${open ? '#BFDBFE' : 'transparent'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
      >
        <IcMore size={15} color={open ? '#2B5CE6' : '#9CA3AF'} />
      </button>

      {open && coords && createPortal(
        <div ref={menuRef} style={{
          position: 'fixed', right: coords.right, top: coords.top, bottom: coords.bottom, zIndex: 4000,
          background: '#fff', borderRadius: '10px', boxShadow: '0 10px 36px rgba(15,22,41,0.16)',
          border: '1px solid #E3E7F0', minWidth: '184px', padding: '5px',
        }}>
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.action(); }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: '7px',
                border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '9px',
                fontSize: '13px', color: item.danger ? '#DC2626' : '#374151',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = item.danger ? '#FEF2F2' : '#F4F6FB'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

// ────────────────────────────────────────────────
// Sortable column header
// ────────────────────────────────────────────────
function SortHeader({ label, field, sortKey, sortDir, onSort }: {
  label: string; field: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '11px', fontWeight: 600, color: active ? '#2B5CE6' : '#6B7280',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}
    >
      {label}
      {active
        ? (sortDir === 'asc' ? <IcSortAsc size={13} color="#2B5CE6" /> : <IcSortDesc size={13} color="#2B5CE6" />)
        : <IcSortAsc size={13} color="#D1D5DB" />
      }
    </button>
  );
}

// ────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { users, deleteUser, toggleStatus } = useUsers();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [previewUser, setPreviewUser] = useState<ManagedUser | null>(null);
  const [protocolsUser, setProtocolsUser] = useState<ManagedUser | null>(null);
  const [detailsUser, setDetailsUser] = useState<ManagedUser | null>(null);

  const registryOrgs = useOrganizations();
  // organizations = registry (so a brand-new, still-empty org is selectable) ∪ orgs existing users already belong to
  const organizations = useMemo(() => {
    return Array.from(new Set([
      ...registryOrgs.map(o => o.fullName),
      ...users.map(u => u.organization),
    ].filter(Boolean) as string[])).sort();
  }, [users, registryOrgs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const displayUsers = useMemo(() => {
    let result = users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        || (u.organization ?? '').toLowerCase().includes(q) || (u.department ?? '').toLowerCase().includes(q)
        || (u.position ?? '').toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchOrg = orgFilter === 'all' || u.organization === orgFilter;
      return matchSearch && matchRole && matchStatus && matchOrg;
    });

    result.sort((a, b) => {
      let av: string = '', bv: string = '';
      if (sortKey === 'name') { av = a.name; bv = b.name; }
      else if (sortKey === 'organization') { av = a.organization ?? ''; bv = b.organization ?? ''; }
      else if (sortKey === 'department') { av = a.department ?? ''; bv = b.department ?? ''; }
      else if (sortKey === 'role') { av = a.role; bv = b.role; }
      else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      else if (sortKey === 'status') { av = a.status; bv = b.status; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [users, search, roleFilter, statusFilter, orgFilter, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    orgs: new Set(users.map(u => u.organization)).size,
  }), [users]);

  const openAdd = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u: ManagedUser) => { setEditUser(u); setModalOpen(true); };

  const FilterBtn = ({ value, current, label, onChange }: {
    value: string; current: string; label: string; onChange: (v: string) => void;
  }) => (
    <button
      onClick={() => onChange(value)}
      style={{
        padding: '6px 13px', borderRadius: '7px', cursor: 'pointer',
        border: `1.5px solid ${current === value ? '#2B5CE6' : '#E3E7F0'}`,
        background: current === value ? '#2B5CE6' : '#fff',
        color: current === value ? '#fff' : '#374151',
        fontSize: '12.5px', fontWeight: current === value ? 600 : 400,
        transition: 'all 0.14s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>Пользователи</h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '13.5px' }}>
            Управление учётными записями · {stats.total} пользователей из {stats.orgs} организаций
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: '#2B5CE6', color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(43,92,230,0.28)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#2450CC'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#2B5CE6'}
        >
          <IcUserPlus size={16} color="#fff" />
          Добавить пользователя
        </button>
      </div>

      {/* ── Summary stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        {[
          { icon: IcTeam,       label: 'Всего',          val: stats.total    },
          { icon: IcPerson,     label: 'Студенты',       val: stats.students },
          { icon: IcShield,     label: 'Администраторы', val: stats.admins   },
          { icon: IcCheckCircle,label: 'Активных',       val: stats.active   },
          { icon: IcBuilding,   label: 'Организаций',    val: stats.orgs     },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: '12px', padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E8ECF6',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '9px', background: '#1B3D84', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '340px' }}>
            <IcSearch size={15} color="#9CA3AF" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени, email, должности..."
              style={{
                width: '100%', padding: '9px 14px 9px 34px', borderRadius: '9px',
                border: '1.5px solid #E3E7F0', background: '#F8FAFD', fontSize: '13px',
                color: '#0F1629', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#2B5CE6'; (e.target as HTMLInputElement).style.background = '#fff'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E3E7F0'; (e.target as HTMLInputElement).style.background = '#F8FAFD'; }}
            />
          </div>

          <div style={{ width: '1px', height: '28px', background: '#E3E7F0', flexShrink: 0 }} />

          {/* Role filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <IcFilter size={14} color="#9CA3AF" />
            <span style={{ fontSize: '11.5px', color: '#9CA3AF', fontWeight: 600 }}>Роль:</span>
            {(['all', 'student', 'admin'] as const).map(r => (
              <FilterBtn key={r} value={r} current={roleFilter} label={r === 'all' ? 'Все' : r === 'student' ? 'Студенты' : 'Администраторы'} onChange={v => setRoleFilter(v as typeof roleFilter)} />
            ))}
          </div>

          <div style={{ width: '1px', height: '28px', background: '#E3E7F0', flexShrink: 0 }} />

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: '#9CA3AF', fontWeight: 600 }}>Статус:</span>
            {(['all', 'active', 'blocked'] as const).map(s => (
              <FilterBtn key={s} value={s} current={statusFilter} label={s === 'all' ? 'Все' : s === 'active' ? 'Активные' : 'Заблокированные'} onChange={v => setStatusFilter(v as typeof statusFilter)} />
            ))}
          </div>

          {/* Org filter */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <IcBuilding size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              value={orgFilter}
              onChange={e => setOrgFilter(e.target.value)}
              style={{
                padding: '7px 28px 7px 30px', borderRadius: '8px',
                border: `1.5px solid ${orgFilter !== 'all' ? '#2B5CE6' : '#E3E7F0'}`,
                background: orgFilter !== 'all' ? '#EBF1FE' : '#fff',
                color: orgFilter !== 'all' ? '#2B5CE6' : '#374151',
                fontSize: '12.5px', cursor: 'pointer', appearance: 'none', outline: 'none',
                fontWeight: orgFilter !== 'all' ? 600 : 400,
              }}
            >
              <option value="all">Все организации</option>
              {organizations.map(org => <option key={org} value={org}>{org}</option>)}
            </select>
            <IcChevronDown size={13} color={orgFilter !== 'all' ? '#2B5CE6' : '#9CA3AF'} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Active filters summary */}
        {(search || roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all') && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Найдено: <strong style={{ color: '#0F1629' }}>{displayUsers.length}</strong></span>
            <button
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setOrgFilter('all'); }}
              style={{
                fontSize: '12px', color: '#2B5CE6', background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', padding: 0,
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* ── Table — horizontally scrolls on mobile so narrow screens don't clip columns ── */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto', border: '1px solid #F3F4F6' }}>
        {/* Table head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 2.4fr) minmax(140px, 1.6fr) minmax(120px, 1.2fr) 80px 80px 60px',
          padding: '12px 20px', background: '#F8FAFD',
          borderBottom: '1px solid #E3E7F0', gap: '12px',
          minWidth: 760,
        }}>
          <SortHeader label="Пользователь" field="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Организация" field="organization" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Должность" field="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Роль" field="role" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Статус" field="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}></span>
        </div>

        {/* Table body */}
        {displayUsers.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <IcTeam size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 6px', color: '#374151', fontWeight: 500 }}>Пользователи не найдены</p>
            <p style={{ margin: 0, color: '#9CA3AF', fontSize: '13px' }}>Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        ) : displayUsers.map((u, i) => {
          const rl = ROLE_META[u.role];
          const sl = STATUS_META[u.status];
          const [c1, c2] = getAvatarColor(u.id);
          return (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 2.4fr) minmax(140px, 1.6fr) minmax(120px, 1.2fr) 80px 80px 60px',
                padding: '13px 20px', gap: '12px', alignItems: 'center',
                borderBottom: i < displayUsers.length - 1 ? '1px solid #F3F4F6' : 'none',
                transition: 'background 0.1s',
                opacity: u.status === 'blocked' ? 0.75 : 1,
                minWidth: 760,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFBFF'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {/* User info — clickable avatar opens the photo preview if one exists */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                {u.avatar ? (
                  <button
                    onClick={() => setPreviewUser(u)}
                    title="Открыть фото"
                    style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      padding: 0, border: '2px solid #BFDBFE', background: '#fff',
                      cursor: 'pointer', overflow: 'hidden',
                    }}
                  >
                    <img src={u.avatar} alt={u.name} style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    }} />
                  </button>
                ) : (
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: '#fff',
                  }}>
                    {u.name.charAt(0)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#0F1629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <IcMail size={11} color="#9CA3AF" />
                    <span style={{ fontSize: '11.5px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IcBuilding size={12} color="#9CA3AF" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.organization}
                  </span>
                </div>
                {u.department && (
                  <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.department}
                  </div>
                )}
              </div>

              {/* Position */}
              <div style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.position ?? '—'}
              </div>

              {/* Role badge */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px', borderRadius: '5px',
                  fontSize: '11px', fontWeight: 600,
                  background: rl.bg, color: rl.color,
                }}>
                  <IcShield size={9} color={rl.color} />
                  {rl.label}
                </span>
              </div>

              {/* Status badge */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px', borderRadius: '5px',
                  fontSize: '11px', fontWeight: 600,
                  background: sl.bg, color: sl.color,
                }}>
                  {u.status === 'active'
                    ? <IcCheckCircle size={9} color={sl.color} />
                    : <IcWarning size={9} color={sl.color} />
                  }
                  {sl.label}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <RowMenu
                  user={u}
                  onDetails={() => setDetailsUser(u)}
                  onEdit={() => openEdit(u)}
                  onDelete={() => setDeleteTarget(u)}
                  onToggleStatus={() => toggleStatus(u.id)}
                  onProtocols={() => setProtocolsUser(u)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Results count */}
      {displayUsers.length > 0 && (
        <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '12px', color: '#9CA3AF' }}>
          Показано {displayUsers.length} из {users.length} пользователей
        </div>
      )}

      {/* ── Modals ── */}
      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editUser={editUser}
        organizations={organizations}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        {deleteTarget && (
          <DeleteModal
            user={deleteTarget}
            onConfirm={() => { deleteUser(deleteTarget.id); setDeleteTarget(null); }}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </Modal>

      {/* Photo preview modal */}
      {previewUser?.avatar && (
        <PhotoPreviewModal user={previewUser} onClose={() => setPreviewUser(null)} />
      )}

      {/* Per-user protocols modal */}
      {protocolsUser && (
        <UserProtocolsModal user={protocolsUser} onClose={() => setProtocolsUser(null)} />
      )}

      {/* Full user details modal */}
      {detailsUser && (
        <UserDetailsModal user={detailsUser} onClose={() => setDetailsUser(null)} />
      )}
    </div>
  );
}

// ─── Per-user protocols modal ─────────────────────────────────────────────────
function UserProtocolsModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const { courses, getProgress } = useCourses();
  const [loading, setLoading] = useState(true);
  const [passed, setPassed] = useState<{ id: string; title: string; score: number; date: string }[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const enrolled = new Set(user.enrolledCourses ?? []);
    const assigned = courses.filter(c => c.published && enrolled.has(c.id));
    if (assigned.length === 0) { setLoading(false); return; }
    Promise.all(assigned.map(c => getProgress(user.id, c.id).then(p => ({ c, p })).catch(() => null)))
      .then(rows => {
        const out: { id: string; title: string; score: number; date: string }[] = [];
        (rows.filter(Boolean) as { c: any; p: any }[]).forEach(({ c, p }) => {
          const attempts = p?.attempts ?? [];
          const best = attempts.filter((a: any) => a.passed).sort((a: any, b: any) => b.score - a.score)[0];
          if (best || p?.status === 'completed') {
            out.push({ id: c.id, title: c.title, score: best ? Math.round(best.score) : 100, date: best?.completedAt ?? new Date().toISOString() });
          }
        });
        setPassed(out);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [user.id]);

  const dl = async (course: { id: string; title: string }) => {
    setBusyId(course.id);
    try {
      await downloadProtocol({
        user: { id: user.id, name: user.name, position: user.position, organization: user.organization, requestNumber: user.requestNumber },
        course,
      });
    } catch (e) { console.error(e); } finally { setBusyId(null); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,22,41,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #EEF1F8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcDocument size={18} color="#2B5CE6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Протоколы — {user.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Сданные курсы и их официальные протоколы</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E3E7F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcClose size={14} color="#6B7280" />
          </button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF' }}>Загрузка…</div>
          ) : passed.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', fontSize: 13.5 }}>У пользователя ещё нет сданных курсов.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {passed.map(pc => (
                <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #E8ECF6' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IcCheckCircle size={18} color="#059669" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F1629' }}>{pc.title}</div>
                    <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>
                      {protocolTypeLabel(protocolTypeForCourse(pc.title))} · {pc.score}% · {new Date(pc.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button onClick={() => dl({ id: pc.id, title: pc.title })} disabled={busyId === pc.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: busyId === pc.id ? '#9CA3AF' : '#1B3D84', color: '#fff',
                    fontSize: 12.5, fontWeight: 600, cursor: busyId === pc.id ? 'wait' : 'pointer',
                  }}>
                    <IcDownload size={13} color="#fff" /> {busyId === pc.id ? '…' : 'Протокол (PDF)'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Full user details modal ──────────────────────────────────────────────────
type DetailStatus = 'passed' | 'failed' | 'in_progress' | 'not_started';
// Minimalist: brand blue for "passed", neutral greys for everything else.
const DETAIL_STATUS_META: Record<DetailStatus, { label: string; color: string }> = {
  passed:      { label: 'Сдан',       color: '#2B5CE6' },
  failed:      { label: 'Не сдан',    color: '#9CA3AF' },
  in_progress: { label: 'В процессе', color: '#6B7280' },
  not_started: { label: 'Не начат',   color: '#B6BECC' },
};
function detailStatusIcon(s: DetailStatus) {
  if (s === 'passed')      return <IcCheckCircle size={15} color="#2B5CE6" />;
  if (s === 'failed')      return <IcXCircle size={15} color="#9CA3AF" />;
  if (s === 'in_progress') return <IcClock size={15} color="#6B7280" />;
  return <IcClock size={15} color="#B6BECC" />;
}

interface CourseStat {
  id: string; title: string; status: DetailStatus;
  bestScore: number | null; attempts: number; lastDate: string | null; passingScore: number; timeSpent: number;
}

function UserDetailsModal({ user: initialUser, onClose }: { user: ManagedUser; onClose: () => void }) {
  const { users, refreshUsers } = useUsers();
  const { courses, getProgress } = useCourses();
  // Live record from context so "Последний вход" reflects the freshest server pull.
  const user = users.find(u => u.id === initialUser.id) ?? initialUser;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CourseStat[]>([]);

  // Pull fresh users once on open so the last-login timestamp is current.
  useEffect(() => { refreshUsers().catch(() => {}); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const enrolled = new Set(initialUser.enrolledCourses ?? []);
    const assigned = sortCourses(courses.filter(c => c.published && enrolled.has(c.id)));
    if (assigned.length === 0) { setStats([]); setLoading(false); return; }
    let alive = true;
    Promise.all(assigned.map(c => getProgress(initialUser.id, c.id).then(p => ({ c, p })).catch(() => ({ c, p: null as any }))))
      .then(rows => {
        if (!alive) return;
        const out: CourseStat[] = rows.map(({ c, p }) => {
          const attempts: any[] = p?.attempts ?? [];
          const passedAttempts = attempts.filter(a => a.passed);
          const ranked = (passedAttempts.length ? passedAttempts : attempts).slice().sort((a, b) => b.score - a.score);
          const best = ranked[0];
          const lastDate = attempts.length
            ? attempts.map(a => a.completedAt).filter(Boolean).sort().slice(-1)[0] ?? null
            : null;
          const timeSpent = attempts.reduce((sum, a) => sum + (Number(a.timeSpent) || 0), 0);
          let status: DetailStatus = 'not_started';
          if (passedAttempts.length || p?.status === 'completed') status = 'passed';
          else if (attempts.length) status = 'failed';
          else if (p?.status === 'in_progress' || (p?.completedLessons?.length ?? 0) > 0) status = 'in_progress';
          return {
            id: c.id, title: c.title, status,
            bestScore: best ? Math.round(best.score) : null,
            attempts: attempts.length, lastDate,
            passingScore: c.test?.passingScore ?? 70, timeSpent,
          };
        });
        setStats(out);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [initialUser.id]);

  const summary = useMemo(() => {
    const by = (s: DetailStatus) => stats.filter(x => x.status === s).length;
    const scored = stats.filter(x => x.bestScore !== null);
    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + (x.bestScore || 0), 0) / scored.length) : null;
    const lastActivity = stats.map(x => x.lastDate).filter(Boolean).sort().slice(-1)[0] ?? null;
    return {
      assigned: stats.length, passed: by('passed'), failed: by('failed'),
      inProgress: by('in_progress'), notStarted: by('not_started'),
      totalAttempts: stats.reduce((s, x) => s + x.attempts, 0),
      totalTime: stats.reduce((s, x) => s + x.timeSpent, 0),
      avg, lastActivity,
    };
  }, [stats]);

  const BLUE = '#2B5CE6', NAVY = '#1B3D84', INK = '#0F1629', GRAY = '#6B7280', FAINT = '#9CA3AF', BORD = '#E8ECF6';
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';
  const fmtDateTime = (d?: string | null) => d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const fmtMins = (m: number) => m <= 0 ? '—' : (m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`);

  const isStudent = user.role === 'student';
  const roleLabel = (ROLE_META[user.role] ?? ROLE_META.student).label;

  const infoRows: { icon: React.ReactNode; label: string; value: string; accent?: boolean }[] = [
    { icon: <IcMail size={14} color={FAINT} />, label: 'Логин', value: user.email || '—' },
    { icon: <IcLock size={14} color={FAINT} />, label: 'Пароль', value: user.password || '—' },
    { icon: <IcPhone size={14} color={FAINT} />, label: 'Телефон', value: user.phone || '—' },
    { icon: <IcBuilding size={14} color={FAINT} />, label: 'Организация', value: user.organization || '—' },
    { icon: <IcBriefcase size={14} color={FAINT} />, label: 'Отдел', value: user.department || '—' },
    { icon: <IcPerson size={14} color={FAINT} />, label: 'Должность', value: user.position || '—' },
    { icon: <IcDocument size={14} color={FAINT} />, label: 'Заявка №', value: user.requestNumber || '—' },
    { icon: <IcClock size={14} color={FAINT} />, label: 'Зарегистрирован', value: fmtDate(user.createdAt) },
    { icon: <IcClock size={14} color={BLUE} />, label: 'Последний вход', value: fmtDateTime(user.lastLoginAt) ?? 'ещё не входил', accent: true },
  ];

  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,22,41,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(15,22,41,0.22)' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          {user.avatar
            ? <img src={user.avatar} alt="" style={{ width: 46, height: 46, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 46, height: 46, borderRadius: 11, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{initial}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: GRAY, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: BLUE }}>{roleLabel}</span>
              <span style={{ color: '#D6DCE8' }}>•</span>
              <span style={{ color: user.status === 'active' ? BLUE : FAINT, fontWeight: 600 }}>
                {user.status === 'active' ? 'Активен' : 'Заблокирован'}
              </span>
            </div>
          </div>
          <button onClick={() => refreshUsers().catch(() => {})} title="Обновить" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORD}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcRefresh size={14} color={GRAY} />
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORD}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcClose size={14} color={GRAY} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {/* Profile grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px 20px', marginBottom: 20 }}>
            {infoRows.map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 9, minWidth: 0 }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>{r.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: 13.5, color: r.accent ? BLUE : INK, fontWeight: r.accent ? 700 : 500, wordBreak: 'break-word' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary — monochrome, brand-blue numbers */}
          {isStudent && (
            <div style={{ display: 'flex', flexWrap: 'wrap', border: `1px solid ${BORD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              {[
                { label: 'Назначено', value: summary.assigned },
                { label: 'Сдано', value: summary.passed },
                { label: 'В процессе', value: summary.inProgress },
                { label: 'Не начато', value: summary.notStarted },
                { label: 'Попыток', value: summary.totalAttempts },
                { label: 'Средний балл', value: summary.avg !== null ? `${summary.avg}%` : '—' },
                { label: 'Время', value: fmtMins(summary.totalTime) },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: '1 1 84px', padding: '12px 8px', textAlign: 'center', borderLeft: i ? `1px solid ${BORD}` : 'none' }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: NAVY, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Per-course breakdown */}
          {isStudent && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <IcBook size={14} color={GRAY} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Курсы и результаты</span>
              </div>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: FAINT, fontSize: 13 }}>Загрузка статистики…</div>
              ) : stats.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: FAINT, fontSize: 13 }}>Пользователю не назначены курсы.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {stats.map(s => {
                    const m = DETAIL_STATUS_META[s.status];
                    return (
                      <div key={s.id} style={{ padding: '12px 14px', borderRadius: 11, border: `1px solid ${BORD}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ flexShrink: 0, display: 'flex' }}>{detailStatusIcon(s.status)}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: m.color }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: GRAY, margin: '7px 0 8px' }}>
                          {s.bestScore !== null ? `Лучший: ${s.bestScore}% · ` : ''}Порог: {s.passingScore}% · Попыток: {s.attempts}
                          {s.timeSpent ? ` · ${fmtMins(s.timeSpent)}` : ''}
                          {s.lastDate ? ` · ${fmtDate(s.lastDate)}` : ''}
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: '#EEF1F8', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, s.bestScore ?? 0)}%`, background: s.status === 'passed' ? BLUE : '#C7D2E8', borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Photo preview modal ──────────────────────────────────────────────────────
function PhotoPreviewModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const ext = (() => {
    const m = (user.avatar || '').match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
    return m ? m[1].toLowerCase() : 'jpg';
  })();
  // ASCII-safe filename: ФИО transliterated would be ideal but simplest is
  // to just take the user id and ext — admins know who's who from the list.
  const safeName = user.name.replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_').slice(0, 60);
  const downloadName = `${safeName || user.id}.${ext}`;

  const downloadFile = async () => {
    if (!user.avatar) return;
    setDownloading(true);
    try {
      // Fetch as blob so we get a real save dialog (cross-origin direct <a download>
      // sometimes opens the image instead of saving).
      const res = await fetch(user.avatar);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = downloadName;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in a new tab so the user can save manually.
      window.open(user.avatar!, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,22,41,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF1F8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {user.organization}{user.position ? ` · ${user.position}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #E3E7F0',
            background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={14} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', justifyContent: 'center', background: '#F4F6FB' }}>
          <img src={user.avatar} alt={user.name} style={{
            maxWidth: '100%', maxHeight: '60vh', borderRadius: 10,
            objectFit: 'contain', background: '#fff',
            boxShadow: '0 4px 16px rgba(15,22,41,0.12)',
          }} />
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #EEF1F8', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 8, border: '1.5px solid #E3E7F0',
            background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Закрыть
          </button>
          <button onClick={downloadFile} disabled={downloading} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: downloading ? '#9CA3AF' : '#2B5CE6', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? 'Скачивание…' : 'Скачать'}
          </button>
        </div>
      </div>
    </div>
  );
}