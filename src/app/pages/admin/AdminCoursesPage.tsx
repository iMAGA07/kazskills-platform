import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses } from '../../context/CoursesContext';
import {
  IcPlus, IcSearch, IcEdit, IcTrash,
  IcBook, IcCheckCircle, IcRefresh,
} from '../../components/Icons';

const NAVY  = '#1B3D84';
const BLUE  = '#2B5CE6';
const BORDER = '#E8ECF6';
const FAINT  = '#F4F6FB';
const RED   = '#DC2626';

export default function AdminCoursesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { courses, loading, error, refetch, deleteCourse } = useCourses();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  const filtered = courses.filter(c =>
    search === '' || c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    setDeletingId(id);
    setConfirmId(null);
    try {
      await deleteCourse(id);
    } catch (e: any) {
      console.error('Delete course error:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>{t('admin.courses')}</h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '13.5px' }}>
            {loading ? 'Загрузка...' : `Управление курсами платформы · ${courses.length} курсов`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => refetch()}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '9px',
              background: FAINT, border: `1.5px solid ${BORDER}`,
              color: '#6B7280', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
            }}
            title="Обновить список"
          >
            <IcRefresh size={14} color="#6B7280" />
          </button>
          <button
            onClick={() => navigate('/admin/courses/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 18px', borderRadius: '9px',
              background: BLUE, border: 'none', color: '#fff',
              fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(43,92,230,0.3)',
            }}
          >
            <IcPlus size={15} color="#fff" />
            {t('admin.create_course')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: RED }}>
          ⚠️ {error}
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
          <IcSearch size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию курса..."
            style={{
              width: '100%', padding: '10px 14px 10px 38px',
              borderRadius: '9px', border: '1.5px solid #E3E7F0',
              background: '#fff', fontSize: '13.5px', color: '#0F1629',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = BLUE)}
            onBlur={e => (e.target.style.borderColor = '#E3E7F0')}
          />
        </div>
      </div>

      {/* Courses table */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 110px 100px',
          padding: '12px 20px',
          background: FAINT,
          borderBottom: `1px solid ${BORDER}`,
          gap: '12px',
        }}>
          {['Курс', 'Статус', 'Вопросов', 'Действия'].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ display: 'inline-block', fontSize: '24px', animation: 'spin 1s linear infinite' }}>⟳</div>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Загрузка курсов из базы данных...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9CA3AF' }}>
            <IcBook size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
            {search ? (
              <p style={{ margin: 0 }}>Ничего не найдено по запросу «{search}»</p>
            ) : (
              <>
                <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#6B7280' }}>Курсов пока нет</p>
                <button
                  onClick={() => navigate('/admin/courses/new')}
                  style={{ padding: '8px 18px', borderRadius: 8, background: BLUE, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Создать первый курс
                </button>
              </>
            )}
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((course, i) => (
          <div
            key={course.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 110px 100px',
              padding: '14px 20px',
              gap: '12px',
              borderBottom: i < filtered.length - 1 ? `1px solid ${FAINT}` : 'none',
              alignItems: 'center',
              transition: 'background 0.12s',
              opacity: deletingId === course.id ? 0.4 : 1,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFBFF'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
          >
            {/* Title */}
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '8px',
                background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IcBook size={17} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#0F1629', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {course.title}
                </div>
                <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: 2 }}>
                  {course.lessons.length} {course.lessons.length === 1 ? 'материал' : course.lessons.length < 5 ? 'материала' : 'материалов'}
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 600,
                color: course.published ? '#059669' : '#9CA3AF',
                background: course.published ? '#D1FAE5' : FAINT,
                border: `1px solid ${course.published ? '#6EE7B7' : BORDER}`,
                padding: '4px 10px', borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}>
                <IcCheckCircle size={11} color={course.published ? '#059669' : '#9CA3AF'} />
                {course.published ? 'Опубликован' : 'Черновик'}
              </span>
            </div>

            {/* Questions count */}
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {course.test.questions.length} вопр.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                style={{
                  width: 32, height: 32, borderRadius: '7px',
                  background: FAINT, border: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                title="Редактировать"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EBF1FE'; (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = FAINT; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
              >
                <IcEdit size={13} color="#6B7280" />
              </button>
              <button
                onClick={() => handleDelete(course.id)}
                disabled={deletingId === course.id}
                style={{
                  width: 32, height: 32, borderRadius: '7px',
                  background: confirmId === course.id ? '#FEF2F2' : FAINT,
                  border: `1px solid ${confirmId === course.id ? '#FECACA' : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.12s',
                  position: 'relative',
                }}
                title={confirmId === course.id ? 'Нажмите ещё раз для подтверждения' : 'Удалить'}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FECACA'; }}
                onMouseLeave={e => {
                  if (confirmId !== course.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = FAINT;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                  }
                }}
              >
                <IcTrash size={13} color={confirmId === course.id ? RED : '#9CA3AF'} />
              </button>
            </div>
          </div>
        ))}

        {/* Confirm delete tooltip */}
        {confirmId && (
          <div style={{
            padding: '10px 20px', background: '#FFFBEB', borderTop: '1px solid #FDE68A',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ fontSize: '13px', color: '#92400E' }}>
              ⚠️ Нажмите кнопку удаления ещё раз для подтверждения
            </span>
            <button
              onClick={() => setConfirmId(null)}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #FDE68A', background: '#fff', color: '#92400E', cursor: 'pointer', fontSize: '12px' }}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
