import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useUsers, type ManagedUser } from '../../context/UsersContext';
import { useCourses } from '../../context/CoursesContext';
import {
  IcSearch, IcFilter, IcUserPlus, IcPerson, IcShield, IcTeam,
  IcBook, IcMedal, IcEdit, IcTrash, IcClose, IcBuilding,
  IcCheck, IcSortAsc, IcSortDesc, IcChevronDown, IcMail,
  IcPhone, IcBriefcase, IcLock, IcMore, IcCheckCircle, IcWarning,
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
  role: 'admin' | 'student';
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

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
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
  const publishedCourses = courses.filter(c => c.published);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPass, setShowPass] = useState(false);
  const [customOrg, setCustomOrg] = useState(false);
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
        setForm(EMPTY_FORM);
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
    if (!form.email.trim()) e.email = 'Обязательное поле';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Некорректный email';
    if (!editUser && !form.password.trim()) e.password = 'Обязательное поле';
    else if (!editUser && form.password.length < 6) e.password = 'Минимум 6 символов';
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Email" required>
                  <input
                    type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="user@company.kz"
                    style={{ ...inputStyle, borderColor: errors.email ? '#DC2626' : '#E3E7F0' }}
                    onFocus={e => (e.target.style.borderColor = errors.email ? '#DC2626' : '#2B5CE6')}
                    onBlur={e => (e.target.style.borderColor = errors.email ? '#DC2626' : '#E3E7F0')}
                  />
                  {errors.email && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.email}</span>}
                </Field>
                <Field label="Телефон">
                  <input
                    value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+7 (700) 000-00-00"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#2B5CE6')}
                    onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
                  />
                </Field>
              </div>

              <Field label={editUser ? 'Пароль (оставьте пустым для сохранения)' : 'Пароль'} required={!editUser}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Минимум 6 символов"
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
                {errors.password && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.password}</span>}
              </Field>

              {/* Section: Роль и статус */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px', marginBottom: '2px' }}>
                Роль и статус
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Роль" required>
                  <Dropdown
                    value={form.role}
                    onChange={v => set('role', v)}
                    options={[
                      { value: 'student', label: 'Студент' },
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
                {customOrg ? (
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
                {errors.organization && <span style={{ fontSize: '11.5px', color: '#DC2626' }}>{errors.organization}</span>}
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              {/* Section: Назначить курсы */}
              {publishedCourses.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px', marginBottom: '2px' }}>
                    Назначить курсы
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {publishedCourses.map(course => {
                      const checked = form.assignedCourses.includes(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', borderRadius: 8,
                            border: `1.5px solid ${checked ? '#2B5CE6' : '#E3E7F0'}`,
                            background: checked ? '#EBF1FE' : '#fff',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${checked ? '#2B5CE6' : '#D1D5DB'}`,
                            background: checked ? '#2B5CE6' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.12s',
                          }}>
                            {checked && <IcCheck size={11} color="#fff" />}
                          </div>
                          <span style={{ fontSize: 13, color: checked ? '#1B3D84' : '#374151', fontWeight: checked ? 500 : 400, flex: 1 }}>
                            {course.title}
                          </span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {course.lessons.length} мат.
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.assignedCourses.length > 0 && (
                    <div style={{ fontSize: 12, color: '#2B5CE6', marginTop: 2 }}>
                      Назначено курсов: {form.assignedCourses.length}
                    </div>
                  )}
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
function RowMenu({ user, onEdit, onDelete, onToggleStatus }: {
  user: ManagedUser;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: 30, height: 30, borderRadius: '7px', background: open ? '#F4F6FB' : 'transparent',
          border: `1px solid ${open ? '#E3E7F0' : 'transparent'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F4F6FB'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E3E7F0'; }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }
        }}
      >
        <IcMore size={15} color="#9CA3AF" />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '36px', zIndex: 100,
          background: '#fff', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #E3E7F0', minWidth: '168px', padding: '4px',
        }}>
          {[
            { icon: <IcEdit size={14} color="#374151" />, label: 'Редактировать', action: () => { setOpen(false); onEdit(); }, danger: false },
            {
              icon: user.status === 'active'
                ? <IcWarning size={14} color="#D97706" />
                : <IcCheckCircle size={14} color="#059669" />,
              label: user.status === 'active' ? 'Заблокировать' : 'Разблокировать',
              action: () => { setOpen(false); onToggleStatus(); },
              danger: false,
            },
            { icon: <IcTrash size={14} color="#DC2626" />, label: 'Удалить', action: () => { setOpen(false); onDelete(); }, danger: true },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '7px',
                border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12.5px', color: item.danger ? '#DC2626' : '#374151',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = item.danger ? '#FEF2F2' : '#F4F6FB'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
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

  // unique organizations
  const organizations = useMemo(() => {
    return Array.from(new Set(users.map(u => u.organization))).sort();
  }, [users]);

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

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #F3F4F6' }}>
        {/* Table head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.4fr 1.6fr 1.2fr 80px 80px 60px',
          padding: '12px 20px', background: '#F8FAFD',
          borderBottom: '1px solid #E3E7F0', gap: '12px',
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
                gridTemplateColumns: '2.4fr 1.6fr 1.2fr 80px 80px 60px',
                padding: '13px 20px', gap: '12px', alignItems: 'center',
                borderBottom: i < displayUsers.length - 1 ? '1px solid #F3F4F6' : 'none',
                transition: 'background 0.1s',
                opacity: u.status === 'blocked' ? 0.75 : 1,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFBFF'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${c1}, ${c2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#fff',
                }}>
                  {u.name.charAt(0)}
                </div>
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
                  onEdit={() => openEdit(u)}
                  onDelete={() => setDeleteTarget(u)}
                  onToggleStatus={() => toggleStatus(u.id)}
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
    </div>
  );
}