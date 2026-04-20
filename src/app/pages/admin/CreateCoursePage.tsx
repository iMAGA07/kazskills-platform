import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  IcArrowLeft as ArrowLeft, IcPlus as Plus, IcTrash as Trash2,
  IcCheck as Check, IcWarning as AlertCircle, IcSave as Save,
  IcGrip as GripVertical, IcYoutube as Youtube, IcDocument as FileText,
  IcPresentation as Presentation, IcClose as XIcon, IcDownload as UploadIcon,
  IcUpload, IcSettings,
} from '../../components/Icons';
import { useLanguage } from '../../context/LanguageContext';
import { useCourses, Lesson, Question, QOption, CourseInput, QuestionType } from '../../context/CoursesContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;

// ─── Palette ──────────────────────────────────────────────
const NAVY   = '#1B3D84';
const BLUE   = '#2B5CE6';
const BORDER = '#E3E7F0';
const FAINT  = '#F8FAFD';
const RED    = '#DC2626';
const GREEN  = '#059669';

type ContentType = 'video' | 'pdf' | 'pptx';

interface MaterialDraft {
  id: string; title: string; type: ContentType; url: string;
  fileName?: string; // original uploaded file name
}
interface QuestionDraft {
  id: string; type: QuestionType; text: string;
  options: QOption[]; correctAnswer: string; points: number;
  minScale: number; maxScale: number;
}

const Q_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq',          label: 'Один из нескольких' },
  { value: 'open_answer',  label: 'Открытый ответ'    },
  { value: 'input_field',  label: 'Ввод текста'       },
  { value: 'scale',        label: 'Шкала'             },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: '8px',
  border: `1.5px solid ${BORDER}`, background: FAINT, color: '#0F1629',
  fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};
const onFocus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = BLUE);
const onBlur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = BORDER);

const newMaterial = (): MaterialDraft => ({ id: Date.now().toString() + Math.random(), title: '', type: 'video', url: '' });
const newQuestion = (): QuestionDraft => ({
  id: Date.now().toString() + Math.random(), type: 'mcq', text: '',
  options: [{ id: '1', text: '' }, { id: '2', text: '' }],
  correctAnswer: '', points: 10, minScale: 1, maxScale: 10,
});

const STEP_LABELS = ['Основное', 'Материалы', 'Тест', 'Настройки'];

export default function CreateCoursePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { createCourse, updateCourse, getCourse } = useCourses();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // File upload state
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Upload file to server
  const uploadFile = useCallback(async (matId: string, file: File) => {
    setUploadingIds(prev => new Set(prev).add(matId));
    setUploadErrors(prev => { const n = { ...prev }; delete n[matId]; return n; });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BASE}/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка загрузки');
      const uploadedName = data.name ?? file.name;
      const nameWithoutExt = uploadedName.replace(/\.[^/.]+$/, '');
      setMaterials(prev => prev.map(m => m.id === matId
        ? {
            ...m,
            url: data.url,
            fileName: uploadedName,
            // Auto-fill title from filename if still empty
            title: m.title.trim() ? m.title : nameWithoutExt,
          }
        : m
      ));
    } catch (e: any) {
      setUploadErrors(prev => ({ ...prev, [matId]: e.message ?? 'Ошибка загрузки' }));
    } finally {
      setUploadingIds(prev => { const n = new Set(prev); n.delete(matId); return n; });
    }
  }, []);

  // Step 1 – Basic
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');

  // Step 2 – Materials
  const [materials, setMaterials] = useState<MaterialDraft[]>([newMaterial()]);

  // Step 3 – Test questions
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);

  // Step 4 – Settings
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit,    setTimeLimit]    = useState(20);
  const [maxAttempts,  setMaxAttempts]  = useState(3);
  const [published,    setPublished]    = useState(false);

  // Load existing course for editing
  useEffect(() => {
    if (!editId) return;
    const course = getCourse(editId);
    if (!course) return;
    setTitle(course.title);
    setDesc(course.description);
    setMaterials(course.lessons.map(l => {
      // Derive a display filename from the URL for pre-saved file materials
      const derivedFileName = l.type !== 'video' && l.url
        ? decodeURIComponent(l.url.split('/').pop() ?? '') || l.url
        : undefined;
      return { id: l.id, title: l.title, type: l.type as ContentType, url: l.url, fileName: derivedFileName };
    }));
    setQuestions(course.test.questions.map(q => ({
      id: q.id, type: q.type, text: q.text,
      options: q.options ?? [],
      correctAnswer: (q.correctAnswer as string) ?? '',
      points: q.points, minScale: q.minScale ?? 1, maxScale: q.maxScale ?? 10,
    })));
    setPassingScore(course.test.passingScore);
    setTimeLimit(course.test.timeLimit);
    setMaxAttempts(course.test.maxAttempts);
    setPublished(course.published);
  }, [editId, getCourse]);

  // ── Material helpers ──
  const addMaterial    = () => setMaterials(p => [...p, newMaterial()]);
  const removeMaterial = (id: string) => setMaterials(p => p.filter(m => m.id !== id));
  const updMaterial    = (id: string, f: keyof MaterialDraft, v: any) =>
    setMaterials(p => p.map(m => m.id === id ? { ...m, [f]: v } : m));

  // ── Question helpers ──
  const addQ      = () => setQuestions(p => [...p, newQuestion()]);
  const removeQ   = (id: string) => setQuestions(p => p.filter(q => q.id !== id));
  const updQ      = (id: string, f: keyof QuestionDraft, v: any) =>
    setQuestions(p => p.map(q => q.id === id ? { ...q, [f]: v } : q));
  const addOpt    = (qId: string) =>
    setQuestions(p => p.map(q => q.id === qId ? { ...q, options: [...q.options, { id: Date.now().toString(), text: '' }] } : q));
  const updOpt    = (qId: string, oId: string, text: string) =>
    setQuestions(p => p.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === oId ? { ...o, text } : o) } : q));
  const removeOpt = (qId: string, oId: string) =>
    setQuestions(p => p.map(q => q.id === qId ? { ...q, options: q.options.filter(o => o.id !== oId) } : q));

  // ── Validation ──
  const canNext = () => {
    if (step === 0) return title.trim().length >= 3;
    if (step === 1) return materials.every(m => m.title.trim() && m.url.trim()) && uploadingIds.size === 0;
    if (step === 2) return questions.every(q => q.text.trim() && q.points > 0);
    return true;
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const input: CourseInput = {
        title: title.trim(),
        description: desc.trim(),
        published,
        lessons: materials.map((m, i) => ({
          id: m.id, title: m.title, type: m.type, url: m.url, order: i,
        })),
        test: {
          questions: questions.map(q => ({
            id: q.id, type: q.type, text: q.text,
            options: q.type === 'mcq' ? q.options : undefined,
            correctAnswer: q.correctAnswer || undefined,
            points: q.points,
            minScale: q.minScale,
            maxScale: q.maxScale,
          })),
          timeLimit, passingScore, maxAttempts,
        },
      };

      if (editId) {
        await updateCourse(editId, input);
      } else {
        await createCourse(input);
      }
      setSaved(true);
      setTimeout(() => navigate('/admin/courses'), 1000);
    } catch (e: any) {
      setSaveError(e.message ?? 'Ошибка при сохранении');
      setSaving(false);
    }
  };

  const card: React.CSSProperties = {
    padding: '24px', borderRadius: '14px',
    background: '#fff', border: `1px solid ${BORDER}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px',
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/admin/courses')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '13.5px', marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={16} color="currentColor" /> Назад к курсам
      </button>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>
          {editId ? 'Редактировать курс' : t('admin.create_course')}
        </h1>
        <p style={{ color: '#6B7280', margin: 0, fontSize: '13.5px' }}>Заполните все шаги для создания курса</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', marginBottom: 24, background: '#fff', borderRadius: 12, padding: '16px 20px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {STEP_LABELS.map((label, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: idx < step ? 'pointer' : 'default' }}
              onClick={() => idx < step && setStep(idx)}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${idx < step ? NAVY : idx === step ? BLUE : BORDER}`,
                background: idx < step ? NAVY : idx === step ? '#EBF1FE' : FAINT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                color: idx < step ? '#fff' : idx === step ? BLUE : '#9CA3AF',
              }}>
                {idx < step ? <Check size={13} color="#fff" /> : idx + 1}
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: idx === step ? 600 : 400, color: idx === step ? '#0F1629' : '#6B7280', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: idx < step ? NAVY : BORDER, margin: '0 10px', borderRadius: 1, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Основное ── */}
      {step === 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', color: '#0F1629' }}>Основная информация</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 7, color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                Название курса *
              </label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Введите название курса..."
                style={inp} onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 7, color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                Описание курса
              </label>
              <textarea
                value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Опишите содержание и цели курса..."
                rows={5}
                style={{ ...inp, resize: 'vertical', lineHeight: '1.6', fontFamily: 'Inter, sans-serif' } as any}
                onFocus={onFocus as any} onBlur={onBlur as any}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Материалы ── */}
      {step === 1 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', color: '#0F1629' }}>Материалы курса</h3>
          <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: '13px' }}>
            Добавьте учебные материалы: видео с YouTube, PDF-документы или PPTX-презентации
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {materials.map((mat, idx) => (
              <div key={mat.id} style={{ padding: 18, borderRadius: 10, background: FAINT, border: `1px solid ${BORDER}` }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <GripVertical size={15} color="#D1D5DB" />
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', flex: 1 }}>Материал {idx + 1}</span>
                  {materials.length > 1 && (
                    <button
                      onClick={() => removeMaterial(mat.id)}
                      style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid #FECACA`, background: '#FEF2F2', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px' }}
                    >
                      <Trash2 size={12} color={RED} /> Удалить
                    </button>
                  )}
                </div>

                {/* Title */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: '12px', fontWeight: 500 }}>
                    Название материала *
                  </label>
                  <input
                    type="text" value={mat.title}
                    onChange={e => updMaterial(mat.id, 'title', e.target.value)}
                    placeholder="Например: Основы пожарной безопасности..."
                    style={inp} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>

                {/* Type picker */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    { value: 'video', label: '▶ YouTube видео' },
                    { value: 'pdf',   label: '📄 PDF документ' },
                    { value: 'pptx',  label: '📊 Презентация'  },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updMaterial(mat.id, 'type', opt.value)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        border: `1.5px solid ${mat.type === opt.value ? BLUE : BORDER}`,
                        background: mat.type === opt.value ? '#EBF1FE' : '#fff',
                        color: mat.type === opt.value ? BLUE : '#6B7280',
                        cursor: 'pointer', fontSize: '12px', fontWeight: mat.type === opt.value ? 600 : 400,
                        transition: 'all 0.14s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* URL field / File upload */}
                <div>
                  {mat.type === 'video' ? (
                    <>
                      <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: '12px', fontWeight: 500 }}>
                        Ссылка YouTube *
                      </label>
                      <input
                        type="url" value={mat.url}
                        onChange={e => updMaterial(mat.id, 'url', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        style={inp} onFocus={onFocus} onBlur={onBlur}
                      />
                      {mat.url && (() => {
                        const m = mat.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
                        if (!m) return null;
                        return (
                          <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                            <img
                              src={`https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`}
                              alt="YouTube preview"
                              style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{ padding: '6px 10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>▶ YouTube</span>
                              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>ID: {m[1]}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: '12px', fontWeight: 500 }}>
                        Загрузить документ * <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(PDF, PPTX, PPT, ODP, DOCX…)</span>
                      </label>

                      {/* Hidden file input — accepts PDF, PPTX, PPT, ODP and other document formats */}
                      <input
                        ref={el => fileInputRefs.current[mat.id] = el}
                        type="file"
                        accept=".pdf,.pptx,.ppt,.odp,.key,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.oasis.opendocument.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadFile(mat.id, file);
                          e.target.value = '';
                        }}
                      />

                      {/* Uploaded file indicator OR upload button */}
                      {mat.url && mat.fileName ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8,
                          background: '#F0FDF4', border: `1.5px solid #86EFAC`,
                        }}>
                          <div style={{ fontSize: 20 }}>{mat.type === 'pdf' ? '📄' : '📊'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#15803D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {mat.fileName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#166534' }}>Файл успешно загружен</div>
                          </div>
                          <button
                            onClick={() => {
                              updMaterial(mat.id, 'url', '');
                              updMaterial(mat.id, 'fileName', '');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF' }}
                            title="Удалить файл"
                          >
                            <XIcon size={16} color="#9CA3AF" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => fileInputRefs.current[mat.id]?.click()}
                            disabled={uploadingIds.has(mat.id)}
                            style={{
                              width: '100%', padding: '20px 16px',
                              border: `2px dashed ${uploadingIds.has(mat.id) ? '#BFDBFE' : BORDER}`,
                              borderRadius: 10, background: uploadingIds.has(mat.id) ? '#EBF1FE' : FAINT,
                              cursor: uploadingIds.has(mat.id) ? 'not-allowed' : 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!uploadingIds.has(mat.id)) (e.currentTarget as HTMLButtonElement).style.background = '#F0F4FF'; }}
                            onMouseLeave={e => { if (!uploadingIds.has(mat.id)) (e.currentTarget as HTMLButtonElement).style.background = FAINT; }}
                          >
                            {uploadingIds.has(mat.id) ? (
                              <>
                                <div style={{ width: 28, height: 28, border: '3px solid #E0E7FF', borderTop: `3px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 4px' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: BLUE }}>Загрузка файла...</span>
                                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Пожалуйста, подождите</span>
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><IcUpload size={28} color="#374151" /></div>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                  Нажмите для выбора файла
                                </span>
                                <span style={{ fontSize: '11.5px', color: '#9CA3AF' }}>
                                  PDF, PPTX, PPT, ODP, DOCX и др. — до 50 МБ
                                </span>
                              </>
                            )}
                          </button>
                          {uploadErrors[mat.id] && (
                            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: RED }}>
                              ⚠ {uploadErrors[mat.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addMaterial}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: 14, borderRadius: 10, border: `2px dashed #BFDBFE`,
                background: '#EBF1FE', color: BLUE, cursor: 'pointer', fontSize: '13.5px', fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#DBEAFE')}
              onMouseLeave={e => (e.currentTarget.style.background = '#EBF1FE')}
            >
              <Plus size={17} color={BLUE} /> Добавить материал
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Тест ── */}
      {step === 2 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', color: '#0F1629' }}>Вопросы теста</h3>
          <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: '13px' }}>
            Добавьте вопросы итогового теста. Тест проводится после изучения всех материалов.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ padding: 20, borderRadius: 10, background: FAINT, border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: '#fff',
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>Вопрос {idx + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280' }}>Балл:</label>
                    <input
                      type="number" value={q.points}
                      onChange={e => updQ(q.id, 'points', Number(e.target.value))}
                      style={{ ...inp, width: 64, padding: '6px 8px', textAlign: 'center' }}
                    />
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQ(q.id)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={12} color={RED} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question type */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {Q_TYPES.map(qt => (
                    <button
                      key={qt.value}
                      onClick={() => updQ(q.id, 'type', qt.value)}
                      style={{
                        padding: '5px 12px', borderRadius: 6,
                        border: `1.5px solid ${q.type === qt.value ? BLUE : BORDER}`,
                        background: q.type === qt.value ? '#EBF1FE' : '#fff',
                        color: q.type === qt.value ? BLUE : '#6B7280',
                        cursor: 'pointer', fontSize: '12px', fontWeight: q.type === qt.value ? 600 : 400,
                      }}
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>

                {/* Question text */}
                <div style={{ marginBottom: 12 }}>
                  <textarea
                    value={q.text}
                    onChange={e => updQ(q.id, 'text', e.target.value)}
                    placeholder="Текст вопроса..."
                    rows={2}
                    style={{ ...inp, resize: 'vertical', lineHeight: '1.5', fontFamily: 'Inter, sans-serif' } as any}
                    onFocus={onFocus as any} onBlur={onBlur as any}
                  />
                </div>

                {/* MCQ options */}
                {q.type === 'mcq' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontSize: '12px' }}>
                      Варианты ответов <span style={{ color: '#9CA3AF' }}>(нажмите кружок для правильного)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
                      {q.options.map((opt, oi) => (
                        <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => updQ(q.id, 'correctAnswer', opt.text)}
                            title="Правильный ответ"
                            style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              border: `2px solid ${q.correctAnswer === opt.text && opt.text ? NAVY : '#D1D5DB'}`,
                              background: q.correctAnswer === opt.text && opt.text ? NAVY : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}
                          >
                            {q.correctAnswer === opt.text && opt.text && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                          </button>
                          <input
                            type="text" value={opt.text}
                            onChange={e => updOpt(q.id, opt.id, e.target.value)}
                            placeholder={`Вариант ${oi + 1}`}
                            style={{ ...inp, flex: 1 }} onFocus={onFocus} onBlur={onBlur}
                          />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOpt(q.id, opt.id)} style={{ padding: 4, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                              <Trash2 size={13} color="#9CA3AF" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addOpt(q.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: `1.5px dashed #BFDBFE`, background: 'transparent', color: BLUE, cursor: 'pointer', fontSize: '12px' }}
                    >
                      <Plus size={12} color={BLUE} /> Добавить вариант
                    </button>
                  </div>
                )}

                {/* Input field */}
                {q.type === 'input_field' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 7, color: '#374151', fontSize: '12px' }}>Правильный ответ</label>
                    <input
                      type="text" value={q.correctAnswer}
                      onChange={e => updQ(q.id, 'correctAnswer', e.target.value)}
                      placeholder="Правильный ответ..."
                      style={{ ...inp, maxWidth: 320 }} onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                )}

                {/* Scale */}
                {q.type === 'scale' && (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {[{ label: 'Мин.', key: 'minScale' }, { label: 'Макс.', key: 'maxScale' }].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: '12px' }}>{label}</label>
                        <input
                          type="number" value={(q as any)[key]}
                          onChange={e => updQ(q.id, key as any, Number(e.target.value))}
                          style={{ ...inp, width: 80, textAlign: 'center', padding: '9px 8px' }}
                          onFocus={onFocus} onBlur={onBlur}
                        />
                      </div>
                    ))}
                    <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#9CA3AF' }}>Баллы начисляются пропорционально</p>
                  </div>
                )}

                {/* Open answer */}
                {q.type === 'open_answer' && (
                  <div style={{ padding: '10px 13px', borderRadius: 8, background: '#EBF1FE', border: `1px solid #BFDBFE` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={13} color={BLUE} />
                      <span style={{ fontSize: '12px', color: BLUE }}>Ответ проверяется вручную администратором</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addQ}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: 14, borderRadius: 10, border: `2px dashed #BFDBFE`,
                background: '#EBF1FE', color: BLUE, cursor: 'pointer', fontSize: '13.5px', fontWeight: 500,
              }}
            >
              <Plus size={17} color={BLUE} /> Добавить вопрос
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Настройки ── */}
      {step === 3 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', color: '#0F1629' }}>Настройки теста и публикации</h3>
          <p style={{ margin: '0 0 22px', color: '#6B7280', fontSize: '13px' }}>Задайте параметры прохождения итогового теста</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                {t('admin.pass_score')}
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="range" min={50} max={100} value={passingScore}
                  onChange={e => setPassingScore(Number(e.target.value))}
                  style={{ flex: 1, accentColor: BLUE }}
                />
                <div style={{ padding: '6px 12px', borderRadius: 8, background: '#EBF1FE', border: `1px solid #BFDBFE`, fontSize: '15px', fontWeight: 700, color: BLUE, minWidth: 52, textAlign: 'center' }}>
                  {passingScore}%
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                {t('admin.time_limit')} (мин)
              </label>
              <input
                type="number" value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value))}
                min={5} max={180} style={inp} onFocus={onFocus} onBlur={onBlur}
              />
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#9CA3AF' }}>{timeLimit} минут на прохождение теста</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                {t('admin.max_attempts')}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n} onClick={() => setMaxAttempts(n)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 8,
                      border: `1.5px solid ${maxAttempts === n ? BLUE : BORDER}`,
                      background: maxAttempts === n ? '#EBF1FE' : FAINT,
                      color: maxAttempts === n ? BLUE : '#6B7280',
                      cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontSize: '13px', fontWeight: 500 }}>Публикация</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: false, label: 'Черновик' }, { v: true, label: 'Опубликовать' }].map(opt => (
                  <button
                    key={String(opt.v)} onClick={() => setPublished(opt.v)}
                    style={{
                      flex: 1, padding: 11, borderRadius: 8,
                      border: `1.5px solid ${published === opt.v ? BLUE : BORDER}`,
                      background: published === opt.v ? NAVY : FAINT,
                      color: published === opt.v ? '#fff' : '#6B7280',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginTop: 22, padding: '18px 20px', borderRadius: 10, background: FAINT, border: `1px solid ${BORDER}` }}>
            <h4 style={{ margin: '0 0 12px', color: '#0F1629', fontSize: '14px' }}>Сводка курса</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Название',       value: title || '—' },
                { label: 'Материалов',     value: materials.length },
                { label: 'Вопросов',       value: questions.length },
                { label: 'Проходной балл', value: `${passingScore}%` },
                { label: 'Время теста',    value: `${timeLimit} мин` },
                { label: 'Попыток',        value: maxAttempts },
                { label: 'Статус',         value: published ? '✅ Опубликован' : '📝 Черновик' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid #F0F3FA` }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F1629' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} color={RED} />
              <span style={{ fontSize: '13px', color: RED }}>{saveError}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate('/admin/courses')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '11px 22px', borderRadius: 9,
            border: `1.5px solid ${BORDER}`, background: '#fff',
            color: '#374151', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={15} color="currentColor" /> {step === 0 ? 'Отмена' : 'Назад'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '11px 28px', borderRadius: 9,
              background: canNext() ? BLUE : '#E5E7EB',
              border: 'none', color: canNext() ? '#fff' : '#9CA3AF',
              fontSize: '13.5px', fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed',
              boxShadow: canNext() ? '0 2px 12px rgba(43,92,230,0.3)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Далее →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 28px', borderRadius: 9,
              background: saved ? '#059669' : saving ? '#6B7280' : NAVY,
              border: 'none', color: '#fff',
              fontSize: '13.5px', fontWeight: 600,
              cursor: saving || saved ? 'default' : 'pointer',
              boxShadow: '0 2px 12px rgba(27,61,132,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {saved ? (
              <><Check size={15} color="#fff" /> Сохранено!</>
            ) : saving ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⟳</span>
                Сохранение...
              </>
            ) : (
              <><Save size={15} color="#fff" /> {editId ? 'Сохранить изменения' : 'Создать курс'}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}