import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useUsers } from '../../context/UsersContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import {
  IcUserPlus, IcPlus, IcClose, IcChevronDown, IcTeam,
  IcBook, IcDocument, IcCheck, IcDownload,
} from '../../components/Icons';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
} from 'docx';

const NAVY  = '#1B3D84';
const BLUE  = '#2B5CE6';
const BORDER = '#E8ECF6';
const MUTED  = '#6B7280';

// ─── Download helper ──────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Cell builder helpers ─────────────────────────────────────────────────────
function hdrCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct * 100, type: WidthType.DXA },
    shading: { fill: '1B3D84' },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })],
    })],
  });
}
function dataCell(text: string, center = false) {
  return new TableCell({
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20 })],
    })],
  });
}
function makeTable(header: TableRow, rows: TableRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      insideH:{ style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideV:{ style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
  });
}

// ─── Report generators ────────────────────────────────────────────────────────
async function generateZayavka(
  org: string,
  users: ReturnType<typeof useUsers>['users'],
  courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: `Заявка · ${org}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, size: 20, color: '555555' })],
    }),
  ];

  const published = courses.filter(c => c.published);

  for (const course of published) {
    const enrolled = students.filter(u => u.enrolledCourses.includes(course.id));
    if (enrolled.length === 0) continue;

    children.push(new Paragraph({
      spacing: { before: 400, after: 160 },
      children: [new TextRun({ text: `«${course.title}»`, bold: true, size: 24 })],
    }));

    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 600),
        hdrCell('Ф. И. О', 3000),
        hdrCell('Должность', 2400),
        hdrCell('Дата прохождения курса', 2400),
      ],
    });

    const rows = enrolled.map((u, i) => {
      const prog = progressMap[`${u.id}:${course.id}`];
      const passing = prog?.attempts?.filter(a => a.passed).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      const date = passing
        ? new Date(passing.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';
      return new TableRow({ children: [
        dataCell(String(i + 1), true),
        dataCell(u.name),
        dataCell(u.position || '—'),
        dataCell(date, true),
      ]});
    });

    children.push(makeTable(hdr, rows));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Заявка_${org}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.docx`);
}

async function generateLoginsPasswords(
  org: string,
  users: ReturnType<typeof useUsers>['users'],
  courses: ReturnType<typeof useCourses>['courses'],
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: `Логины и пароли · ${org}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, size: 20, color: '555555' })],
    }),
  ];

  const published = courses.filter(c => c.published);

  for (const course of published) {
    const enrolled = students.filter(u => u.enrolledCourses.includes(course.id));
    if (enrolled.length === 0) continue;

    children.push(new Paragraph({
      spacing: { before: 400, after: 160 },
      children: [new TextRun({ text: `«${course.title}»`, bold: true, size: 24 })],
    }));

    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 600),
        hdrCell('Ф. И. О', 2600),
        hdrCell('Должность', 2200),
        hdrCell('Логин', 1600),
        hdrCell('Пароль', 1400),
      ],
    });

    const rows = enrolled.map((u, i) => new TableRow({ children: [
      dataCell(String(i + 1), true),
      dataCell(u.name),
      dataCell(u.position || '—'),
      dataCell(u.email),
      dataCell(u.password || '—'),
    ]}));

    children.push(makeTable(hdr, rows));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Логины_пароли_${org}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.docx`);
}

async function generateStatistika(
  org: string,
  users: ReturnType<typeof useUsers>['users'],
  courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org);
  const published = courses.filter(c => c.published);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: `Статистика · ${org}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, size: 20, color: '555555' })],
    }),
  ];

  // Header row: №, ФИО, course1, course2, ...
  const colW = Math.floor(5000 / Math.max(published.length, 1));
  const hdrCells = [
    hdrCell('№', 600),
    hdrCell('Ф. И. О', 2400),
    ...published.map(c => hdrCell(c.title.length > 20 ? c.title.slice(0, 18) + '…' : c.title, colW)),
  ];
  const hdr = new TableRow({ tableHeader: true, children: hdrCells });

  const rows = students.map((u, i) => {
    const cells = [
      dataCell(String(i + 1), true),
      dataCell(u.name),
      ...published.map(c => {
        const prog = progressMap[`${u.id}:${c.id}`];
        if (!prog || prog.attempts.length === 0) return dataCell('—', true);
        const best = prog.attempts
          .filter(a => a.passed)
          .sort((a, b) => b.score - a.score)[0]
          ?? prog.attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
        return dataCell(best ? `${Math.round(best.score)}%` : '—', true);
      }),
    ];
    return new TableRow({ children: cells });
  });

  children.push(makeTable(hdr, rows));

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Статистика_${org}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.docx`);
}

// ─── Report Modal ─────────────────────────────────────────────────────────────
type ReportType = 'zayavka' | 'logins' | 'statistika';

const REPORT_TYPES: { value: ReportType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: 'zayavka',    label: 'Заявка',           desc: 'ФИО · Должность · Дата прохождения курса', icon: IcDocument },
  { value: 'logins',     label: 'Логины и пароли',  desc: 'ФИО · Должность · Логин · Пароль',         icon: IcBook },
  { value: 'statistika', label: 'Статистика',        desc: 'ФИО · Баллы по каждому курсу (%)',          icon: IcTeam },
];

function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users } = useUsers();
  const { courses, getProgress } = useCourses();

  const [step,       setStep]       = useState<1 | 2>(1);
  const [type,       setType]       = useState<ReportType | null>(null);
  const [org,        setOrg]        = useState('');
  const [generating, setGenerating] = useState(false);
  const [done,       setDone]       = useState(false);

  const organizations = [...new Set(
    users.filter(u => u.role === 'student').map(u => u.organization)
  )].sort();

  useEffect(() => {
    if (open) { setStep(1); setType(null); setOrg(''); setDone(false); }
  }, [open]);

  if (!open) return null;

  const needsProgress = type === 'zayavka' || type === 'statistika';

  const handleGenerate = async () => {
    if (!type || !org) return;
    setGenerating(true);
    try {
      let progressMap: Record<string, UserProgress | null> = {};

      if (needsProgress) {
        const students = users.filter(u => u.role === 'student' && u.organization === org);
        const published = courses.filter(c => c.published);
        const pairs = students.flatMap(u => published.map(c => ({ uid: u.id, cid: c.id })));
        const results = await Promise.all(
          pairs.map(({ uid, cid }) => getProgress(uid, cid).catch(() => null))
        );
        pairs.forEach(({ uid, cid }, i) => { progressMap[`${uid}:${cid}`] = results[i]; });
      }

      if (type === 'zayavka')    await generateZayavka(org, users, courses, progressMap);
      if (type === 'logins')     await generateLoginsPasswords(org, users, courses);
      if (type === 'statistika') await generateStatistika(org, users, courses, progressMap);

      setDone(true);
      setTimeout(() => onClose(), 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,22,41,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 72px rgba(0,0,0,0.14)', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px 18px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcDocument size={20} color={BLUE} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: '#0F1629' }}>Сформировать отчёт</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                {step === 1 ? 'Шаг 1 из 2 · Выберите тип отчёта' : 'Шаг 2 из 2 · Выберите организацию'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E3E7F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IcCheck size={28} color="#059669" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#059669', margin: '0 0 6px' }}>Отчёт сформирован!</p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Файл загружен на ваше устройство.</p>
            </div>
          ) : step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: MUTED }}>Выберите вид отчёта, который нужно сформировать:</p>
              {REPORT_TYPES.map(rt => {
                const Icon = rt.icon;
                const selected = type === rt.value;
                return (
                  <button
                    key={rt.value}
                    onClick={() => setType(rt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      border: `2px solid ${selected ? BLUE : '#E3E7F0'}`,
                      background: selected ? '#EBF1FE' : '#FAFBFF',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.14s',
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: selected ? BLUE : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={selected ? '#fff' : '#6B7280'} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: selected ? BLUE : '#0F1629' }}>{rt.label}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{rt.desc}</div>
                    </div>
                    {selected && <IcCheck size={18} color={BLUE} style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: MUTED }}>
                Выберите организацию, по которой нужно сформировать отчёт:
              </p>
              <div style={{ position: 'relative' }}>
                <select
                  value={org}
                  onChange={e => setOrg(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 36px 10px 14px', borderRadius: 9,
                    border: `1.5px solid ${org ? BLUE : '#E3E7F0'}`, background: '#fff',
                    fontSize: 13.5, color: org ? '#0F1629' : '#9CA3AF',
                    appearance: 'none', outline: 'none', cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">— Выберите организацию —</option>
                  {organizations.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <IcChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {org && (
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 9, background: '#F8FAFD', border: '1px solid #E3E7F0' }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 600 }}>Будет включено в отчёт:</div>
                  {(() => {
                    const count = users.filter(u => u.role === 'student' && u.organization === org).length;
                    const selected = REPORT_TYPES.find(r => r.value === type);
                    return (
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        <strong style={{ color: NAVY }}>{count}</strong> слушателей · Тип: <strong style={{ color: NAVY }}>{selected?.label}</strong>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
            {step === 2 && (
              <button onClick={() => setStep(1)}
                style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #E3E7F0', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
                ← Назад
              </button>
            )}
            <button onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #E3E7F0', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
              Отмена
            </button>
            {step === 1 ? (
              <button
                onClick={() => type && setStep(2)}
                disabled={!type}
                style={{
                  padding: '9px 24px', borderRadius: 9, border: 'none',
                  background: type ? BLUE : '#E5E7EB', color: type ? '#fff' : '#9CA3AF',
                  fontSize: 13.5, fontWeight: 600, cursor: type ? 'pointer' : 'not-allowed',
                }}>
                Далее →
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!org || generating}
                style={{
                  padding: '9px 24px', borderRadius: 9, border: 'none', display: 'flex', alignItems: 'center', gap: 7,
                  background: org && !generating ? NAVY : '#E5E7EB',
                  color: org && !generating ? '#fff' : '#9CA3AF',
                  fontSize: 13.5, fontWeight: 600, cursor: org && !generating ? 'pointer' : 'not-allowed',
                }}>
                {generating ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Формирование…
                  </>
                ) : (
                  <><IcDownload size={15} color="#fff" /> Скачать .docx</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { users } = useUsers();
  const { courses } = useCourses();

  const [reportOpen, setReportOpen] = useState(false);

  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalCourses  = courses.filter(c => c.published).length;
  const orgs          = new Set(users.map(u => u.organization)).size;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 4px', color: '#0F1629', fontSize: 26 }}>Панель администратора</h1>
        <p style={{ color: MUTED, margin: 0, fontSize: 13.5 }}>
          {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
        {[
          { label: 'Слушателей', value: totalStudents, icon: IcTeam },
          { label: 'Курсов',     value: totalCourses,  icon: IcBook },
          { label: 'Организаций',value: orgs,           icon: IcDocument },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{
            flex: '1 1 160px', background: '#fff', borderRadius: 12, padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Add user */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '32px 28px',
          boxShadow: '0 2px 12px rgba(43,92,230,0.08)', border: `1.5px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcUserPlus size={26} color={BLUE} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F1629', marginBottom: 6 }}>Добавить пользователя</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              ФИО, место работы, должность, логин и пароль. Назначьте курсы непосредственно при создании.
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            style={{
              marginTop: 4, padding: '10px 22px', borderRadius: 9, border: 'none',
              background: BLUE, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(43,92,230,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2450CC')}
            onMouseLeave={e => (e.currentTarget.style.background = BLUE)}
          >
            <IcUserPlus size={14} color="#fff" style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Добавить пользователя
          </button>
        </div>

        {/* Report */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '32px 28px',
          boxShadow: '0 2px 12px rgba(27,61,132,0.08)', border: `1.5px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcDocument size={26} color={NAVY} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F1629', marginBottom: 6 }}>Сформировать отчёт</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              Три вида отчётов в формате Word: заявка, логины и пароли, статистика по курсам.
            </div>
          </div>
          <button
            onClick={() => setReportOpen(true)}
            style={{
              marginTop: 4, padding: '10px 22px', borderRadius: 9, border: 'none',
              background: NAVY, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(27,61,132,0.25)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#163272')}
            onMouseLeave={e => (e.currentTarget.style.background = NAVY)}
          >
            <IcDownload size={14} color="#fff" style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Сформировать отчёт
          </button>
        </div>
      </div>

      {/* Secondary actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Управление курсами', path: '/admin/courses', icon: IcBook },
          { label: 'Пользователи',       path: '/admin/users',   icon: IcTeam },
          { label: 'Создать курс',       path: '/admin/courses/new', icon: IcPlus },
        ].map(({ label, path, icon: Icon }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 9,
              border: `1.5px solid ${BORDER}`, background: '#fff',
              color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.14s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE; (e.currentTarget as HTMLButtonElement).style.color = BLUE; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
          >
            <Icon size={15} color="currentColor" />
            {label}
          </button>
        ))}
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
