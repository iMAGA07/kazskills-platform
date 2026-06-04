import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useUsers, type ManagedUser } from '../../context/UsersContext';
import { useCourses, type UserProgress } from '../../context/CoursesContext';
import { getCurrentOrganization, useOrganizations } from '../../lib/organization';
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher';
import { InstructionModal } from '../../components/shared/InstructionModal';
import { IcLogout, IcDownload, IcSearch, IcCheckCircle, IcClock, IcTeam, IcRefresh } from '../../components/Icons';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
} from 'docx';

const NAVY = '#1B3D84';
const BLUE = '#2B5CE6';
const BORDER = '#E8ECF6';
const MUTED = '#6B7280';

type CourseStatus = 'passed' | 'failed' | 'in_progress' | 'not_started';
interface CourseResult {
  courseId: string;
  title: string;
  status: CourseStatus;
  score: number | null;
  date: string | null;
}
interface StudentRow {
  user: ManagedUser;
  results: CourseResult[];
  passedCount: number;
  totalCount: number;
}

const STATUS_META: Record<CourseStatus, { label: string; color: string; bg: string }> = {
  passed:      { label: 'Сдал',      color: '#059669', bg: '#D1FAE5' },
  failed:      { label: 'Не сдал',   color: '#DC2626', bg: '#FEE2E2' },
  in_progress: { label: 'В процессе', color: '#2B5CE6', bg: '#EBF1FE' },
  not_started: { label: 'Не начат',  color: '#9CA3AF', bg: '#F3F4F6' },
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return '—'; }
}
function fileDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── docx helpers ──────────────────────────────────────────────────────────────
function hdrCell(text: string, w: number) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: '1B3D84' },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
  });
}
function dataCell(text: string, center = false) {
  return new TableCell({
    children: [new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text, size: 20 })] })],
  });
}
function makeTable(header: TableRow, rows: TableRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '1B3D84' },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideV: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
  });
}

export default function RepDashboard() {
  const { user, logout } = useAuth();
  const { users } = useUsers();
  const { courses, getProgress } = useCourses();
  useOrganizations();
  const org = getCurrentOrganization();
  const navigate = useNavigate();

  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInstr, setShowInstr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Only this representative's organization students.
  const students = useMemo(
    () => users.filter(u => u.role === 'student'),
    [users]
  );
  const publishedCourses = useMemo(() => courses.filter(c => c.published), [courses]);

  const loadProgress = useCallback(async () => {
    if (students.length === 0 || publishedCourses.length === 0) { setLoading(false); return; }
    const map: Record<string, UserProgress> = {};
    await Promise.all(students.flatMap(s =>
      (s.enrolledCourses ?? [])
        .filter(cid => publishedCourses.some(c => c.id === cid))
        .map(cid => getProgress(s.id, cid)
          .then(p => { map[`${s.id}:${cid}`] = p; })
          .catch(() => {}))
    ));
    setProgressMap(map);
  }, [students, publishedCourses, getProgress]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadProgress().finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length, publishedCourses.length]);

  const refresh = async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  };

  // Build per-student rows with per-course status.
  const rows: StudentRow[] = useMemo(() => {
    return students.map(s => {
      const assigned = (s.enrolledCourses ?? [])
        .map(cid => publishedCourses.find(c => c.id === cid))
        .filter(Boolean) as typeof publishedCourses;

      const results: CourseResult[] = assigned.map(c => {
        const prog = progressMap[`${s.id}:${c.id}`];
        const attempts = prog?.attempts ?? [];
        const passing = attempts.filter(a => a.passed).sort((a, b) => b.score - a.score)[0];
        if (passing || prog?.status === 'completed') {
          return { courseId: c.id, title: c.title, status: 'passed', score: passing ? Math.round(passing.score) : null, date: passing?.completedAt ?? null };
        }
        if (attempts.length > 0) {
          const best = [...attempts].sort((a, b) => b.score - a.score)[0];
          return { courseId: c.id, title: c.title, status: 'failed', score: Math.round(best.score), date: best.completedAt };
        }
        if (prog?.status === 'in_progress' || (prog?.completedLessons?.length ?? 0) > 0) {
          return { courseId: c.id, title: c.title, status: 'in_progress', score: null, date: null };
        }
        return { courseId: c.id, title: c.title, status: 'not_started', score: null, date: null };
      });

      return {
        user: s,
        results,
        passedCount: results.filter(r => r.status === 'passed').length,
        totalCount: results.length,
      };
    });
  }, [students, publishedCourses, progressMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.user.name.toLowerCase().includes(q) ||
      (r.user.position ?? '').toLowerCase().includes(q) ||
      (r.user.department ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    let passed = 0, inProgress = 0, notStarted = 0, totalAssignments = 0;
    rows.forEach(r => r.results.forEach(res => {
      totalAssignments++;
      if (res.status === 'passed') passed++;
      else if (res.status === 'in_progress' || res.status === 'failed') inProgress++;
      else notStarted++;
    }));
    return { employees: rows.length, passed, inProgress, notStarted, totalAssignments };
  }, [rows]);

  // ── Protocol (Word) download ──
  const buildProtocol = (subset: StudentRow[], titleSuffix: string) => {
    const orgName = org?.fullName ?? user?.organization ?? '';
    const children: (Paragraph | Table)[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 100 }, children: [new TextRun({ text: 'Протокол обучения', bold: true, size: 32 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `Организация: ${orgName}`, size: 22, bold: true })] }),
      new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, size: 20, color: '666666' })] }),
    ];

    subset.forEach((row, idx) => {
      children.push(new Paragraph({
        spacing: { before: idx === 0 ? 0 : 360, after: 120 },
        children: [new TextRun({ text: `${idx + 1}. ${row.user.name}${row.user.position ? ` — ${row.user.position}` : ''}`, bold: true, size: 24 })],
      }));
      if (row.results.length === 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Курсы не назначены.', size: 20, color: '999999' })] }));
        return;
      }
      const header = new TableRow({ tableHeader: true, children: [
        hdrCell('№', 500), hdrCell('Курс', 4600), hdrCell('Статус', 1800), hdrCell('Балл', 1100), hdrCell('Дата', 1600),
      ]});
      const trows = row.results.map((r, i) => new TableRow({ children: [
        dataCell(String(i + 1), true),
        dataCell(r.title),
        dataCell(STATUS_META[r.status].label, true),
        dataCell(r.score != null ? `${r.score}%` : '—', true),
        dataCell(fmtDate(r.date), true),
      ]}));
      children.push(makeTable(header, trows));
    });

    return new Document({ sections: [{ children }] });
  };

  const downloadOne = async (row: StudentRow) => {
    const doc = buildProtocol([row], row.user.name);
    const blob = await Packer.toBlob(doc);
    const safe = row.user.name.replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_').slice(0, 50);
    downloadBlob(blob, `Протокол_${safe}_${fileDate()}.docx`);
  };
  const downloadAll = async () => {
    const subset = filtered.length ? filtered : rows;
    const doc = buildProtocol(subset, 'all');
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `Протокол_${(org?.displayName ?? 'организация')}_${fileDate()}.docx`);
  };

  // ── Guards ──
  if (!user) return <Navigate to="/internal-access" replace />;
  if (user.role !== 'representative') {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/courses'} replace />;
  }

  return (
    <div style={{ minHeight: '100dvh' as any, background: '#EDF0F8', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org.displayName} style={{ height: 38, maxWidth: 120, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 9, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {(org?.displayName ?? 'KS').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1629', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Кабинет представителя
              </div>
              <div style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {org?.fullName ?? user.organization}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowInstr(true)} title="Инструкция" style={{
              padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff',
              color: '#374151', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
            }}>📘 Инструкция</button>
            <LanguageSwitcher variant="light" />
            <button onClick={() => { logout(); navigate('/internal-access'); }} title="Выйти" style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcLogout size={17} color="#6B7280" />
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: 20, boxSizing: 'border-box' }}>
        {/* Title + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: '0 0 2px', fontSize: 22, color: '#0F1629' }}>Прогресс обучения сотрудников</h1>
            <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
              Актуальный список — кто сдал, кто проходит, кто не начал.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} disabled={refreshing} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff',
              color: '#374151', cursor: refreshing ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              <IcRefresh size={14} color="#374151" /> {refreshing ? 'Обновление…' : 'Обновить'}
            </button>
            <button onClick={downloadAll} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9, border: 'none', background: NAVY,
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <IcDownload size={14} color="#fff" /> Протокол по всем
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          {[
            { label: 'Сотрудников', value: stats.employees, icon: IcTeam, color: NAVY },
            { label: 'Сдано', value: stats.passed, icon: IcCheckCircle, color: '#059669' },
            { label: 'В процессе / не сдано', value: stats.inProgress, icon: IcClock, color: '#2B5CE6' },
            { label: 'Не начато', value: stats.notStarted, icon: IcClock, color: '#9CA3AF' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ flex: '1 1 160px', background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F1629', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <IcSearch size={15} color="#9CA3AF" />
          </span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по ФИО, должности, отделу…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 9, border: `1.5px solid ${BORDER}`, background: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: MUTED }}>Загрузка прогресса…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: MUTED, background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}` }}>
            {rows.length === 0 ? 'Сотрудники ещё не добавлены.' : 'Ничего не найдено.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(row => (
              <div key={row.user.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: 1 }}>
                    {row.user.avatar ? (
                      <img src={row.user.avatar} alt={row.user.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #BFDBFE', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#2B5CE6,#5B4EF0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                        {row.user.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0F1629' }}>{row.user.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
                        {row.user.position || '—'}{row.user.department ? ` · ${row.user.department}` : ''}
                        {row.totalCount > 0 && <span> · сдано {row.passedCount}/{row.totalCount}</span>}
                      </div>
                      {/* Per-course chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {row.results.length === 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Курсы не назначены</span>}
                        {row.results.map(r => {
                          const m = STATUS_META[r.status];
                          return (
                            <span key={r.courseId} title={r.title} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              maxWidth: 260, padding: '4px 10px', borderRadius: 999,
                              background: m.bg, color: m.color, fontSize: 11.5, fontWeight: 600,
                            }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{r.title}</span>
                              <span style={{ opacity: 0.75 }}>· {m.label}{r.score != null ? ` ${r.score}%` : ''}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => downloadOne(row)} title="Скачать протокол" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff',
                    color: '#374151', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  }}>
                    <IcDownload size={13} color="currentColor" /> Протокол
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 18, fontSize: 11.5, color: '#9CA3AF', textAlign: 'center' }}>
          Доступ только к мониторингу прогресса и протоколам вашей организации.
        </p>
      </main>

      <InstructionModal open={showInstr} onClose={() => setShowInstr(false)} />
    </div>
  );
}
