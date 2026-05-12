import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useUsers, type ManagedUser, type BatchUserInput } from '../../context/UsersContext';
import { useCourses, UserProgress } from '../../context/CoursesContext';
import { getCurrentOrganization } from '../../lib/organization';
import {
  IcUserPlus, IcPlus, IcClose, IcChevronDown, IcTeam,
  IcBook, IcDocument, IcCheck, IcDownload, IcTrash,
  IcCheckCircle, IcBuilding, IcBriefcase,
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

// ─── Random generators ────────────────────────────────────────────────────────
function genLogin6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function genPassword4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Report generators ────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const todayStr = () => new Date().toLocaleDateString('ru-RU');
const fileDate = () => new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');

async function generateZayavka(
  org: string,
  users: ManagedUser[],
  courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>,
  requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org
    && (!requestNum || u.requestNumber === requestNum));
  const published = courses.filter(c => c.published);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Заявка`, bold: true, size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Организация: ${org}`, size: 22, bold: true })],
    }),
  ];
  if (requestNum) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Номер заявки: ${requestNum}`, size: 22, bold: true })],
    }));
  }
  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: `Дата формирования: ${todayStr()}`, size: 20, color: '666666' })],
  }));

  if (students.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Слушатели не найдены.', size: 22, color: 'CC0000' })] }));
  }

  for (const course of published) {
    children.push(new Paragraph({
      spacing: { before: 500, after: 160 },
      children: [new TextRun({ text: `«${course.title}»`, bold: true, size: 24 })],
    }));
    if (students.length === 0) continue;
    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 600), hdrCell('Ф. И. О', 3000),
        hdrCell('Должность', 2400), hdrCell('Дата прохождения курса', 2400),
      ],
    });
    const rows = students.map((u, i) => {
      const prog = progressMap[`${u.id}:${course.id}`];
      const passing = prog?.attempts?.filter(a => a.passed).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      const date = passing ? fmtDate(passing.completedAt) : '—';
      return new TableRow({ children: [
        dataCell(String(i + 1), true), dataCell(u.name),
        dataCell(u.position || '—'), dataCell(date, true),
      ]});
    });
    children.push(makeTable(hdr, rows));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Заявка_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.docx`);
}

async function generateLoginsPasswords(
  org: string,
  users: ManagedUser[],
  courses: ReturnType<typeof useCourses>['courses'],
  requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org
    && (!requestNum || u.requestNumber === requestNum));
  const published = courses.filter(c => c.published);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Логины и пароли`, bold: true, size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Организация: ${org}`, size: 22, bold: true })],
    }),
  ];
  if (requestNum) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Номер заявки: ${requestNum}`, size: 22, bold: true })],
    }));
  }
  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: `Дата формирования: ${todayStr()}`, size: 20, color: '666666' })],
  }));

  if (students.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Слушатели не найдены.', size: 22, color: 'CC0000' })] }));
  }

  for (const course of published) {
    children.push(new Paragraph({
      spacing: { before: 500, after: 160 },
      children: [new TextRun({ text: `«${course.title}»`, bold: true, size: 24 })],
    }));
    if (students.length === 0) continue;
    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 600), hdrCell('Ф. И. О', 2600),
        hdrCell('Должность', 2200), hdrCell('Логин', 1800), hdrCell('Пароль', 1200),
      ],
    });
    const rows = students.map((u, i) => new TableRow({ children: [
      dataCell(String(i + 1), true), dataCell(u.name),
      dataCell(u.position || '—'), dataCell(u.email), dataCell(u.password || '—'),
    ]}));
    children.push(makeTable(hdr, rows));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Логины_пароли_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.docx`);
}

async function generateStatistika(
  org: string,
  users: ManagedUser[],
  courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>,
  requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org
    && (!requestNum || u.requestNumber === requestNum));
  const published = courses.filter(c => c.published);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Статистика`, bold: true, size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Организация: ${org}`, size: 22, bold: true })],
    }),
  ];
  if (requestNum) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Номер заявки: ${requestNum}`, size: 22, bold: true })],
    }));
  }
  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: `Дата формирования: ${todayStr()}`, size: 20, color: '666666' })],
  }));

  const colW = Math.floor(5000 / Math.max(published.length, 1));
  const hdrCells = [
    hdrCell('№', 600), hdrCell('Ф. И. О', 2400),
    ...published.map(c => hdrCell(c.title.length > 20 ? c.title.slice(0, 18) + '…' : c.title, colW)),
  ];
  const hdr = new TableRow({ tableHeader: true, children: hdrCells });

  const rows = students.map((u, i) => {
    const cells = [
      dataCell(String(i + 1), true), dataCell(u.name),
      ...published.map(c => {
        const prog = progressMap[`${u.id}:${c.id}`];
        if (!prog || prog.attempts.length === 0) return dataCell('—', true);
        const best = prog.attempts.filter(a => a.passed).sort((a, b) => b.score - a.score)[0]
          ?? prog.attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
        return dataCell(best ? `${Math.round(best.score)}%` : '—', true);
      }),
    ];
    return new TableRow({ children: cells });
  });

  children.push(makeTable(hdr, rows));
  if (students.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Слушатели не найдены.', size: 22, color: 'CC0000' })] }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Статистика_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.docx`);
}

// ─── Word export for batch credentials ────────────────────────────────────────
async function exportBatchCredentials(
  requestNumber: string,
  org: string,
  createdUsers: { name: string; login: string; password: string }[],
) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Логины и пароли`, bold: true, size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Организация: ${org}`, size: 22, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `Номер заявки: ${requestNumber}`, size: 22, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: `Дата формирования: ${todayStr()}`, size: 20, color: '666666' })],
    }),
  ];

  const hdr = new TableRow({
    tableHeader: true,
    children: [
      hdrCell('№', 600), hdrCell('Ф. И. О', 4000),
      hdrCell('Логин', 2000), hdrCell('Пароль', 1800),
    ],
  });

  const rows = createdUsers.map((u, i) => new TableRow({ children: [
    dataCell(String(i + 1), true), dataCell(u.name),
    dataCell(u.login), dataCell(u.password),
  ]}));

  children.push(makeTable(hdr, rows));

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Логины_пароли_заявка_${requestNumber}_${fileDate()}.docx`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BatchCreateModal — 4-step wizard
// ═══════════════════════════════════════════════════════════════════════════════

interface EmployeeRow {
  id: string;
  name: string;
  position: string;
  login: string;
  password: string;
  courses: string[];  // per-user course IDs
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #E3E7F0', background: '#fff',
  fontSize: 13.5, color: '#0F1629', outline: 'none',
  boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
};

function BatchCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addUsersBatch } = useUsers();
  const { courses } = useCourses();
  const { users } = useUsers();
  const publishedCourses = courses.filter(c => c.published);
  const tenantOrg = getCurrentOrganization();

  const organizations = [...new Set(users.filter(u => u.role === 'student').map(u => u.organization))].sort();

  const [step, setStep] = useState(1);

  // Step 1
  const [requestNumber, setRequestNumber] = useState('');
  const [org, setOrg] = useState(tenantOrg?.fullName ?? '');
  const [customOrg, setCustomOrg] = useState(false);
  const [department, setDepartment] = useState('');

  // Step 2
  const [employees, setEmployees] = useState<EmployeeRow[]>([
    { id: '1', name: '', position: '', login: genLogin6(), password: genPassword4(), courses: [] },
  ]);

  // Step 3
  const [courseMode, setCourseMode] = useState<'all' | 'individual'>('all');
  const [globalCourses, setGlobalCourses] = useState<string[]>([]);

  // Step 4
  const [created, setCreated] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<ManagedUser[]>([]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setRequestNumber('');
      setOrg(tenantOrg?.fullName ?? '');
      setCustomOrg(false);
      setDepartment('');
      setEmployees([{ id: '1', name: '', position: '', login: genLogin6(), password: genPassword4(), courses: [] }]);
      setCourseMode('all');
      setGlobalCourses([]);
      setCreated(false);
      setCreatedUsers([]);
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  // ── Step 1 validation ──
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!requestNumber.trim()) e.requestNumber = 'Введите номер заявки';
    if (!org.trim()) e.org = 'Выберите организацию';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 2 validation ──
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    employees.forEach((emp, i) => {
      if (!emp.name.trim()) e[`emp_name_${i}`] = 'ФИО';
    });
    if (employees.length === 0) e.employees = 'Добавьте хотя бы одного сотрудника';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Employee management ──
  const addEmployee = () => {
    setEmployees(prev => [...prev, {
      id: String(Date.now()),
      name: '', position: '',
      login: genLogin6(), password: genPassword4(),
      courses: [],
    }]);
  };

  const removeEmployee = (id: string) => {
    if (employees.length <= 1) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const updateEmployee = (id: string, field: keyof EmployeeRow, value: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    // Clear error
    const idx = employees.findIndex(e => e.id === id);
    if (idx >= 0) setErrors(prev => { const n = { ...prev }; delete n[`emp_name_${idx}`]; return n; });
  };

  const toggleEmployeeCourse = (empId: string, courseId: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id !== empId) return e;
      return {
        ...e,
        courses: e.courses.includes(courseId)
          ? e.courses.filter(c => c !== courseId)
          : [...e.courses, courseId],
      };
    }));
  };

  const toggleGlobalCourse = (courseId: string) => {
    setGlobalCourses(prev =>
      prev.includes(courseId) ? prev.filter(c => c !== courseId) : [...prev, courseId]
    );
  };

  // ── Step navigation ──
  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrors({});
    setStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  // ── Get final courses for each employee ──
  const getFinalCourses = (emp: EmployeeRow): string[] => {
    return courseMode === 'all' ? globalCourses : emp.courses;
  };

  // ── Create users ──
  const handleCreate = () => {
    const batch: BatchUserInput[] = employees.map(emp => ({
      name: emp.name,
      position: emp.position,
      login: emp.login,
      password: emp.password,
      enrolledCourses: getFinalCourses(emp),
    }));
    const result = addUsersBatch(batch, org, department, requestNumber);
    setCreatedUsers(result);
    setCreated(true);
  };

  // ── Export credentials ──
  const handleExport = () => {
    exportBatchCredentials(
      requestNumber, org,
      employees.map(emp => ({
        name: emp.name,
        login: emp.login,
        password: emp.password,
      })),
    );
  };

  // Regenerate all logins/passwords
  const regenAll = () => {
    setEmployees(prev => prev.map(e => ({
      ...e,
      login: genLogin6(),
      password: genPassword4(),
    })));
  };

  const STEP_LABELS = ['Заявка', 'Сотрудники', 'Курсы', 'Проверка'];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,22,41,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget && !created) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 680,
        boxShadow: '0 24px 72px rgba(0,0,0,0.14)', overflow: 'hidden',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px 18px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcTeam size={20} color={BLUE} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: '#0F1629' }}>Пакетное создание пользователей</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                Шаг {step} из 4 · {STEP_LABELS[step - 1]}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E3E7F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: i + 1 <= step ? BLUE : '#E3E7F0',
                transition: 'background 0.2s',
              }} />
              <div style={{
                fontSize: 10.5, color: i + 1 <= step ? BLUE : '#9CA3AF',
                marginTop: 4, fontWeight: i + 1 === step ? 600 : 400,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ─── STEP 1: Request info ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Номер заявки <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  value={requestNumber}
                  onChange={e => { setRequestNumber(e.target.value); setErrors(p => { const n = { ...p }; delete n.requestNumber; return n; }); }}
                  placeholder="Например: 0001"
                  style={{ ...inputStyle, borderColor: errors.requestNumber ? '#DC2626' : '#E3E7F0' }}
                  onFocus={e => e.target.style.borderColor = BLUE}
                  onBlur={e => e.target.style.borderColor = errors.requestNumber ? '#DC2626' : '#E3E7F0'}
                />
                {errors.requestNumber && <span style={{ fontSize: 11, color: '#DC2626' }}>{errors.requestNumber}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Организация <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {tenantOrg ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    background: '#EBF1FE', border: '1.5px solid #D6E0FF',
                  }}>
                    <IcBuilding size={15} color="#2B5CE6" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1B3D84' }}>
                        {tenantOrg.fullName}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        Привязано к поддомену {tenantOrg.slug}.kazskills.kz
                      </div>
                    </div>
                  </div>
                ) : customOrg ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={org}
                      onChange={e => { setOrg(e.target.value); setErrors(p => { const n = { ...p }; delete n.org; return n; }); }}
                      placeholder="Название организации"
                      style={{ ...inputStyle, flex: 1, borderColor: errors.org ? '#DC2626' : '#E3E7F0' }}
                      onFocus={e => e.target.style.borderColor = BLUE}
                      onBlur={e => e.target.style.borderColor = errors.org ? '#DC2626' : '#E3E7F0'}
                    />
                    <button
                      onClick={() => { setCustomOrg(false); setOrg(''); }}
                      style={{
                        padding: '0 12px', borderRadius: 8, border: '1.5px solid #E3E7F0',
                        background: '#F8FAFD', cursor: 'pointer', fontSize: 12, color: '#6B7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Из списка
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={org}
                      onChange={e => {
                        if (e.target.value === '__custom__') { setCustomOrg(true); setOrg(''); }
                        else { setOrg(e.target.value); setErrors(p => { const n = { ...p }; delete n.org; return n; }); }
                      }}
                      style={{
                        ...inputStyle, appearance: 'none' as const, cursor: 'pointer', paddingRight: 32,
                        borderColor: errors.org ? '#DC2626' : '#E3E7F0',
                        color: org ? '#0F1629' : '#9CA3AF',
                      }}
                    >
                      <option value="">— Выберите организацию —</option>
                      {organizations.map(o => <option key={o} value={o}>{o}</option>)}
                      <option value="__custom__">+ Новая организация...</option>
                    </select>
                    <IcChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                )}
                {errors.org && <span style={{ fontSize: 11, color: '#DC2626' }}>{errors.org}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Отдел / Подразделение
                </label>
                <input
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="Например: Производственный отдел"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = BLUE}
                  onBlur={e => e.target.style.borderColor = '#E3E7F0'}
                />
              </div>
            </div>
          )}

          {/* ─── STEP 2: Employees ─── */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                  Добавьте сотрудников. Логин и пароль генерируются автоматически.
                </p>
                <button
                  onClick={addEmployee}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${BLUE}`,
                    background: '#EBF1FE', color: BLUE, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <IcPlus size={13} color={BLUE} />
                  Добавить
                </button>
              </div>

              {errors.employees && <p style={{ color: '#DC2626', fontSize: 12, margin: '0 0 10px' }}>{errors.employees}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {employees.map((emp, idx) => (
                  <div key={emp.id} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 1fr 34px', gap: 8, alignItems: 'start',
                    padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${errors[`emp_name_${idx}`] ? '#FECACA' : '#E3E7F0'}`,
                    background: errors[`emp_name_${idx}`] ? '#FFF7F7' : '#FAFBFF',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: NAVY,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 3,
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <input
                        value={emp.name}
                        onChange={e => updateEmployee(emp.id, 'name', e.target.value)}
                        placeholder="ФИО *"
                        style={{
                          ...inputStyle, fontSize: 13,
                          borderColor: errors[`emp_name_${idx}`] ? '#DC2626' : '#E3E7F0',
                        }}
                        onFocus={e => e.target.style.borderColor = BLUE}
                        onBlur={e => e.target.style.borderColor = errors[`emp_name_${idx}`] ? '#DC2626' : '#E3E7F0'}
                      />
                      {errors[`emp_name_${idx}`] && (
                        <span style={{ fontSize: 10.5, color: '#DC2626' }}>Введите ФИО</span>
                      )}
                    </div>
                    <div>
                      <input
                        value={emp.position}
                        onChange={e => updateEmployee(emp.id, 'position', e.target.value)}
                        placeholder="Должность"
                        style={{ ...inputStyle, fontSize: 13 }}
                        onFocus={e => e.target.style.borderColor = BLUE}
                        onBlur={e => e.target.style.borderColor = '#E3E7F0'}
                      />
                    </div>
                    <button
                      onClick={() => removeEmployee(emp.id)}
                      disabled={employees.length <= 1}
                      style={{
                        width: 30, height: 30, borderRadius: 7,
                        border: '1px solid #E3E7F0', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: employees.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: employees.length <= 1 ? 0.3 : 1,
                        marginTop: 2,
                      }}
                    >
                      <IcTrash size={13} color="#DC2626" />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, textAlign: 'right', fontSize: 12, color: MUTED }}>
                Всего сотрудников: <strong style={{ color: '#0F1629' }}>{employees.length}</strong>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Course assignment ─── */}
          {step === 3 && (
            <div>
              {publishedCourses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED }}>
                  Нет опубликованных курсов для назначения.
                </div>
              ) : (
                <>
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: MUTED }}>
                    Назначьте курсы для сотрудников:
                  </p>

                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    {([
                      { value: 'all' as const, label: 'Одни курсы для всех' },
                      { value: 'individual' as const, label: 'Индивидуально каждому' },
                    ] as const).map(m => (
                      <button
                        key={m.value}
                        onClick={() => setCourseMode(m.value)}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                          border: `2px solid ${courseMode === m.value ? BLUE : '#E3E7F0'}`,
                          background: courseMode === m.value ? '#EBF1FE' : '#fff',
                          fontSize: 13, fontWeight: courseMode === m.value ? 600 : 400,
                          color: courseMode === m.value ? BLUE : '#374151',
                          transition: 'all 0.14s',
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {courseMode === 'all' ? (
                    /* Global course selection */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {publishedCourses.map(course => {
                        const checked = globalCourses.includes(course.id);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => toggleGlobalCourse(course.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 8,
                              border: `1.5px solid ${checked ? BLUE : '#E3E7F0'}`,
                              background: checked ? '#EBF1FE' : '#fff',
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                              border: `2px solid ${checked ? BLUE : '#D1D5DB'}`,
                              background: checked ? BLUE : '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {checked && <IcCheck size={11} color="#fff" />}
                            </div>
                            <span style={{ fontSize: 13, color: checked ? NAVY : '#374151', fontWeight: checked ? 500 : 400, flex: 1 }}>
                              {course.title}
                            </span>
                          </button>
                        );
                      })}
                      {globalCourses.length > 0 && (
                        <div style={{ fontSize: 12, color: BLUE, marginTop: 4 }}>
                          Выбрано курсов: {globalCourses.length} — будут назначены всем {employees.length} сотрудникам
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Per-employee course selection */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {employees.map((emp, idx) => (
                        <div key={emp.id} style={{
                          padding: '12px 14px', borderRadius: 10,
                          border: '1px solid #E3E7F0', background: '#FAFBFF',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1629', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', background: NAVY,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: '#fff',
                            }}>
                              {idx + 1}
                            </div>
                            {emp.name || 'Сотрудник ' + (idx + 1)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {publishedCourses.map(course => {
                              const checked = emp.courses.includes(course.id);
                              return (
                                <button
                                  key={course.id}
                                  type="button"
                                  onClick={() => toggleEmployeeCourse(emp.id, course.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 10px', borderRadius: 6,
                                    border: `1px solid ${checked ? BLUE : '#E3E7F0'}`,
                                    background: checked ? '#EBF1FE' : '#fff',
                                    cursor: 'pointer', textAlign: 'left', fontSize: 12,
                                  }}
                                >
                                  <div style={{
                                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                    border: `2px solid ${checked ? BLUE : '#D1D5DB'}`,
                                    background: checked ? BLUE : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {checked && <IcCheck size={9} color="#fff" />}
                                  </div>
                                  <span style={{ color: checked ? NAVY : '#374151', fontWeight: checked ? 500 : 400 }}>
                                    {course.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── STEP 4: Review & Create ─── */}
          {step === 4 && !created && (
            <div>
              <div style={{
                padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                background: '#F8FAFD', border: '1px solid #E3E7F0',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 13 }}>
                  <div><span style={{ color: MUTED }}>Заявка:</span> <strong style={{ color: '#0F1629' }}>#{requestNumber}</strong></div>
                  <div><span style={{ color: MUTED }}>Организация:</span> <strong style={{ color: '#0F1629' }}>{org}</strong></div>
                  {department && <div><span style={{ color: MUTED }}>Отдел:</span> <strong style={{ color: '#0F1629' }}>{department}</strong></div>}
                  <div><span style={{ color: MUTED }}>Сотрудников:</span> <strong style={{ color: '#0F1629' }}>{employees.length}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Предварительный список
                </p>
                <button
                  onClick={regenAll}
                  style={{
                    fontSize: 11.5, color: BLUE, background: 'none', border: 'none',
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Перегенерировать логины/пароли
                </button>
              </div>

              {/* Preview table */}
              <div style={{ borderRadius: 10, border: '1px solid #E3E7F0', overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 1fr 90px 70px',
                  padding: '10px 14px', background: NAVY, gap: 10,
                  fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase',
                }}>
                  <div>№</div><div>ФИО</div><div>Должность</div><div>Логин</div><div>Пароль</div>
                </div>
                {employees.map((emp, i) => (
                  <div key={emp.id} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 1fr 90px 70px',
                    padding: '9px 14px', gap: 10, fontSize: 12.5, color: '#374151',
                    borderBottom: i < employees.length - 1 ? '1px solid #F3F4F6' : 'none',
                    background: i % 2 === 0 ? '#fff' : '#FAFBFF',
                  }}>
                    <div style={{ color: MUTED, fontWeight: 600 }}>{i + 1}</div>
                    <div style={{ fontWeight: 500, color: '#0F1629' }}>{emp.name || '—'}</div>
                    <div>{emp.position || '—'}</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: BLUE }}>{emp.login}</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: NAVY }}>{emp.password}</div>
                  </div>
                ))}
              </div>

              {/* Course summary */}
              {(courseMode === 'all' ? globalCourses.length > 0 : employees.some(e => e.courses.length > 0)) && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 4 }}>Назначенные курсы:</div>
                  {courseMode === 'all' ? (
                    <div style={{ fontSize: 12, color: '#047857' }}>
                      {globalCourses.map(id => publishedCourses.find(c => c.id === id)?.title).filter(Boolean).join(', ')}
                      <span style={{ color: '#6B7280' }}> — для всех {employees.length} сотрудников</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#047857' }}>
                      Курсы назначены индивидуально каждому сотруднику
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 4: Success ─── */}
          {step === 4 && created && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <IcCheckCircle size={32} color="#059669" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#059669', margin: '0 0 6px' }}>
                Пользователи созданы!
              </p>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 24px' }}>
                Создано <strong style={{ color: '#0F1629' }}>{employees.length}</strong> пользователей по заявке <strong style={{ color: '#0F1629' }}>#{requestNumber}</strong>
              </p>

              <button
                onClick={handleExport}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: NAVY, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,61,132,0.3)',
                }}
              >
                <IcDownload size={17} color="#fff" />
                Экспортировать в Word
              </button>
              <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '10px 0 0' }}>
                Файл с ФИО, логинами и паролями будет скачан на ваше устройство
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F3F4F6',
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          {created ? (
            <button onClick={onClose}
              style={{
                padding: '9px 24px', borderRadius: 9, border: 'none',
                background: BLUE, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}>
              Готово
            </button>
          ) : (
            <>
              {step > 1 && (
                <button onClick={prevStep}
                  style={{
                    padding: '9px 20px', borderRadius: 9, border: '1.5px solid #E3E7F0',
                    background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                  }}>
                  ← Назад
                </button>
              )}
              <button onClick={onClose}
                style={{
                  padding: '9px 20px', borderRadius: 9, border: '1.5px solid #E3E7F0',
                  background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                }}>
                Отмена
              </button>
              {step < 4 ? (
                <button onClick={nextStep}
                  style={{
                    padding: '9px 24px', borderRadius: 9, border: 'none',
                    background: BLUE, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Далее →
                </button>
              ) : (
                <button onClick={handleCreate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 24px', borderRadius: 9, border: 'none',
                    background: '#059669', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
                  }}>
                  <IcCheck size={14} color="#fff" />
                  Создать {employees.length} пользователей
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReportModal (updated with request number filter)
// ═══════════════════════════════════════════════════════════════════════════════
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
  const [requestNum, setRequestNum] = useState('');
  const [generating, setGenerating] = useState(false);
  const [done,       setDone]       = useState(false);

  const organizations = [...new Set(
    users.filter(u => u.role === 'student').map(u => u.organization)
  )].sort();

  // Get request numbers for selected org
  const requestNumbers = [...new Set(
    users.filter(u => u.role === 'student' && u.organization === org && u.requestNumber)
      .map(u => u.requestNumber!)
  )].sort();

  useEffect(() => {
    if (open) { setStep(1); setType(null); setOrg(''); setRequestNum(''); setDone(false); }
  }, [open]);

  if (!open) return null;

  const needsProgress = type === 'zayavka' || type === 'statistika';

  const handleGenerate = async () => {
    if (!type || !org) return;
    setGenerating(true);
    try {
      let progressMap: Record<string, UserProgress | null> = {};

      if (needsProgress) {
        const students = users.filter(u => u.role === 'student' && u.organization === org
          && (!requestNum || u.requestNumber === requestNum));
        const published = courses.filter(c => c.published);
        const pairs = students.flatMap(u => published.map(c => ({ uid: u.id, cid: c.id })));
        const results = await Promise.all(
          pairs.map(({ uid, cid }) => getProgress(uid, cid).catch(() => null))
        );
        pairs.forEach(({ uid, cid }, i) => { progressMap[`${uid}:${cid}`] = results[i]; });
      }

      if (type === 'zayavka')    await generateZayavka(org, users, courses, progressMap, requestNum || undefined);
      if (type === 'logins')     await generateLoginsPasswords(org, users, courses, requestNum || undefined);
      if (type === 'statistika') await generateStatistika(org, users, courses, progressMap, requestNum || undefined);

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
              <p style={{ margin: '0 0 8px', fontSize: 13, color: MUTED }}>Выберите вид отчёта:</p>
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
                Выберите организацию и (опционально) номер заявки:
              </p>

              {/* Org select */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Организация
                </label>
                <select
                  value={org}
                  onChange={e => { setOrg(e.target.value); setRequestNum(''); }}
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
                <IcChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, bottom: 13, pointerEvents: 'none' }} />
              </div>

              {/* Request number filter */}
              {org && requestNumbers.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Номер заявки <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>(необязательно)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={requestNum}
                      onChange={e => setRequestNum(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 36px 10px 14px', borderRadius: 9,
                        border: `1.5px solid ${requestNum ? BLUE : '#E3E7F0'}`, background: '#fff',
                        fontSize: 13.5, color: requestNum ? '#0F1629' : '#9CA3AF',
                        appearance: 'none', outline: 'none', cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Все заявки</option>
                      {requestNumbers.map(rn => <option key={rn} value={rn}>Заявка #{rn}</option>)}
                    </select>
                    <IcChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}

              {org && (
                <div style={{ padding: '12px 14px', borderRadius: 9, background: '#F8FAFD', border: '1px solid #E3E7F0' }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 600 }}>Будет включено в отчёт:</div>
                  {(() => {
                    const count = users.filter(u =>
                      u.role === 'student' && u.organization === org
                      && (!requestNum || u.requestNumber === requestNum)
                    ).length;
                    const selected = REPORT_TYPES.find(r => r.value === type);
                    return (
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        <strong style={{ color: NAVY }}>{count}</strong> слушателей · Тип: <strong style={{ color: NAVY }}>{selected?.label}</strong>
                        {requestNum && <> · Заявка: <strong style={{ color: NAVY }}>#{requestNum}</strong></>}
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { users } = useUsers();
  const { courses } = useCourses();

  const [reportOpen, setReportOpen] = useState(false);
  const [batchOpen, setBatchOpen]   = useState(false);

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
          { label: 'Организаций',value: orgs,           icon: IcBuilding },
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

      {/* Main action cards — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          {
            icon: IcTeam,
            title: 'По заявке (пакетно)',
            desc: 'Создание группы пользователей по заявке от организации с автоматической генерацией логинов и паролей.',
            btn: 'Создать по заявке',
            btnIcon: IcTeam,
            onClick: () => setBatchOpen(true),
          },
          {
            icon: IcUserPlus,
            title: 'Одного пользователя',
            desc: 'Добавить отдельного пользователя вручную с указанием ФИО, должности и назначением курсов.',
            btn: 'Добавить пользователя',
            btnIcon: IcUserPlus,
            onClick: () => navigate('/admin/users'),
          },
          {
            icon: IcDocument,
            title: 'Сформировать отчёт',
            desc: 'Три вида отчётов в формате Word: заявка, логины и пароли, статистика по курсам.',
            btn: 'Сформировать отчёт',
            btnIcon: IcDownload,
            onClick: () => setReportOpen(true),
          },
        ].map(({ icon: Icon, title, desc, btn, btnIcon: BtnIcon, onClick }) => (
          <div key={title} style={{
            background: '#fff', borderRadius: 16, padding: '24px 20px',
            boxShadow: '0 2px 12px rgba(43,92,230,0.07)', border: `1.5px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={24} color={BLUE} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1629', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>{desc}</div>
            </div>
            <button
              onClick={onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 9, border: 'none',
                background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(43,92,230,0.28)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2450CC')}
              onMouseLeave={e => (e.currentTarget.style.background = BLUE)}
            >
              <BtnIcon size={14} color="#fff" />
              {btn}
            </button>
          </div>
        ))}
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
      <BatchCreateModal open={batchOpen} onClose={() => setBatchOpen(false)} />
    </div>
  );
}
