import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
} from 'docx';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  STAMP_B64, STAMP_W, STAMP_H,
  SIG_CHAIR_B64, SIG_CHAIR_W, SIG_CHAIR_H,
  SIG_M1_B64, SIG_M1_W, SIG_M1_H,
  SIG_M2_B64, SIG_M2_W, SIG_M2_H,
} from './protocolAssets';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;

// ─── Commission / training-centre constants (from the official templates) ──────
const TRAINING_ORG = 'Товарищество с ограниченной ответственностью "STK services"';
const CHAIRMAN = 'Айтмухамбетов С.Ж.';
const MEMBER_1 = 'Габбасов Т.У.';
const MEMBER_2 = 'Сергалиев Н.Х.';

export type ProtocolType = 'biot' | 'pb' | 'ptm';

/** Map a course to its protocol template by title keywords. */
export function protocolTypeForCourse(title: string): ProtocolType {
  const t = (title || '').toLowerCase();
  if (t.includes('промышленн')) return 'pb';
  if (t.includes('пожарно') || t.includes('пожарной') || t.includes('птм')) return 'ptm';
  // охрана труда / БиОТ / anything else → БиОТ form
  return 'biot';
}

export function protocolTypeLabel(type: ProtocolType): string {
  return type === 'pb' ? 'Промышленная безопасность'
    : type === 'ptm' ? 'Пожарно-технический минимум'
    : 'Безопасность и охрана труда';
}

/** Grouping key: заявка number if present, else per-user. */
export function protocolGroupKey(user: { id: string; requestNumber?: string }): string {
  return user.requestNumber ? user.requestNumber : `u${user.id}`;
}

/** Ask the server for the (shared) protocol number for this group+course. */
export async function fetchProtocolNumber(groupKey: string, courseId: string): Promise<number | null> {
  try {
    const token = localStorage.getItem('kazskills_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    };
    if (token) headers['x-session-token'] = token;
    const res = await fetch(`${BASE}/protocol-number`, {
      method: 'POST', headers, body: JSON.stringify({ groupKey, courseId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.number === 'number' ? data.number : null;
  } catch { return null; }
}

export function formatProtocolNo(n: number | null): string {
  return n == null ? '____' : String(n).padStart(3, '0');
}

function ruDate(d = new Date()): string {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `«${d.getDate()}» ${months[d.getMonth()]} ${d.getFullYear()} года`;
}

// ─── docx cell helpers ─────────────────────────────────────────────────────────
function cell(text: string, opts: { header?: boolean; w?: number; center?: boolean } = {}) {
  return new TableCell({
    width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
    shading: opts.header ? { fill: 'E8EEF7' } : undefined,
    children: [new Paragraph({
      alignment: opts.center || opts.header ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: !!opts.header, size: 20 })],
    })],
  });
}
function table(header: TableRow, rows: TableRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
      insideV: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
    },
  });
}
function p(text: string, o: { bold?: boolean; center?: boolean; size?: number; italics?: boolean; after?: number; before?: number } = {}) {
  return new Paragraph({
    alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: o.after ?? 80, before: o.before ?? 0 },
    children: [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? 22 })],
  });
}
// ─── Stamp + signature images ──────────────────────────────────────────────────
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function sigImage(b64: string, w: number, h: number, dispH = 44): ImageRun {
  const dispW = Math.max(1, Math.round((w * dispH) / h));
  return new ImageRun({ type: 'png', data: b64ToBytes(b64), transformation: { width: dispW, height: dispH } });
}
function stampFloating(): ImageRun {
  const dispW = 150;
  const dispH = Math.round((STAMP_H * dispW) / STAMP_W);
  return new ImageRun({
    type: 'png',
    data: b64ToBytes(STAMP_B64),
    transformation: { width: dispW, height: dispH },
    floating: {
      // Centre-right over the signature block, slightly above the first line.
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 3300000 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -150000 },
      allowOverlap: true,
      behindDocument: false,
      wrap: { type: TextWrappingType.NONE },
    },
  });
}

function signatures(): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 320, after: 120 }, children: [
      new TextRun({ text: `Председатель комиссии:     ${CHAIRMAN}     `, size: 22 }),
      sigImage(SIG_CHAIR_B64, SIG_CHAIR_W, SIG_CHAIR_H),
      stampFloating(),
    ]}),
    new Paragraph({ spacing: { after: 120 }, children: [
      new TextRun({ text: `Члены комиссии:               ${MEMBER_1}     `, size: 22 }),
      sigImage(SIG_M1_B64, SIG_M1_W, SIG_M1_H),
    ]}),
    new Paragraph({ children: [
      new TextRun({ text: `Члены комиссии:               ${MEMBER_2}     `, size: 22 }),
      sigImage(SIG_M2_B64, SIG_M2_W, SIG_M2_H),
    ]}),
  ];
}

export interface ProtocolData {
  fio: string;
  position: string;
  orgFullName: string;     // employee's organization (ТОО «…»)
  protocolNo: number | null;
  date?: Date;
  education?: string;      // for ПБ; default "Среднее"
}

// ─── БиОТ (Приложение 2) ───────────────────────────────────────────────────────
function buildBiot(d: ProtocolData): (Paragraph | Table)[] {
  const date = d.date ?? new Date();
  return [
    p('Приложение 2 к Правилам и срокам проведения обучения, инструктирования и проверок знаний по вопросам безопасности и охраны труда работников, руководителей и лиц, ответственных за обеспечение безопасности и охраны труда', { size: 16, italics: true, after: 200 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Протокол № ${formatProtocolNo(d.protocolNo)}`, bold: true, size: 28 })] }),
    p('Заседания экзаменационной комиссии по проверке знаний по безопасности и охране труда работников', { center: true, bold: true, after: 120 }),
    p(TRAINING_ORG, { center: true, bold: true, after: 200 }),
    p(`${ruDate(date)} Комиссия в составе:`, {}),
    p(`Председатель: директор — ${CHAIRMAN}`, {}),
    p(`Члены комиссии: эксперт — ${MEMBER_1}, преподаватель — ${MEMBER_2}`, { after: 120 }),
    p('На основании приказа от «30» января 2026 г. №03/26 приняла экзамен и установила:', { after: 60 }),
    p('Вид проверки: первичный', { after: 160 }),
    table(
      new TableRow({ tableHeader: true, children: [
        cell('№', { header: true, w: 500 }), cell('Фамилия, имя, отчество', { header: true, w: 3200 }),
        cell('Должность', { header: true, w: 2200 }), cell('Наименование организации', { header: true, w: 2600 }),
        cell('Отметка о проверке знаний (прошёл, не прошёл)', { header: true, w: 2200 }), cell('Примеч.', { header: true, w: 900 }),
      ]}),
      [new TableRow({ children: [
        cell('1', { center: true }), cell(d.fio), cell(d.position || '—'), cell(d.orgFullName),
        cell('прошёл', { center: true }), cell('—', { center: true }),
      ]})],
    ),
    ...signatures(),
  ];
}

// ─── ПБ (Приложение 4) ─────────────────────────────────────────────────────────
function buildPb(d: ProtocolData): (Paragraph | Table)[] {
  const date = d.date ?? new Date();
  return [
    p('Приложение 4 к Правилам подготовки, переподготовки и проверки знаний руководителей, специалистов и работников в области промышленной безопасности', { size: 16, italics: true, after: 200 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `ПРОТОКОЛ № ${formatProtocolNo(d.protocolNo)}`, bold: true, size: 28 })] }),
    p(TRAINING_ORG, { center: true, bold: true, after: 200 }),
    p(`${ruDate(date)} Комиссия в составе:`, {}),
    p(`Председатель: ${CHAIRMAN}`, {}),
    p(`Члены комиссии: ${MEMBER_1}, ${MEMBER_2}`, { after: 120 }),
    p('Провели проверку знаний в объёме требований промышленной безопасности, установленных Законом РК «О гражданской защите», «Правил обеспечения промышленной безопасности» и нормативными правовыми актами Республики Казахстан:', { after: 60 }),
    p(`У сотрудника компании ${d.orgFullName}`, { after: 60 }),
    p('По курсу «Промышленная безопасность на опасных производственных объектах» установили:', { after: 160 }),
    table(
      new TableRow({ tableHeader: true, children: [
        cell('№', { header: true, w: 500 }), cell('Фамилия, имя, отчество', { header: true, w: 3400 }),
        cell('Должность', { header: true, w: 2400 }), cell('Образование', { header: true, w: 2200 }),
        cell('Заключение комиссии (сдал, не сдал)', { header: true, w: 2400 }),
      ]}),
      [new TableRow({ children: [
        cell('1', { center: true }), cell(d.fio), cell(d.position || '—'), cell(d.education || 'Среднее'),
        cell('Сдал', { center: true }),
      ]})],
    ),
    ...signatures(),
  ];
}

// ─── ПТМ (Приложение 5) ────────────────────────────────────────────────────────
function buildPtm(d: ProtocolData): (Paragraph | Table)[] {
  const date = d.date ?? new Date();
  return [
    p('Приложение 5 к Правилам обучения работников организаций и населения мерам пожарной безопасности и требованиям к содержанию учебных программ по обучению мерам пожарной безопасности', { size: 16, italics: true, after: 200 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Протокол № ${formatProtocolNo(d.protocolNo)} от ${ruDate(date)}`, bold: true, size: 26 })] }),
    p('заседания квалификационной комиссии по проверке знаний по пожарной безопасности в объёме пожарно-технического минимума', { center: true, bold: true, after: 120 }),
    p(TRAINING_ORG, { center: true, bold: true, after: 200 }),
    p('В соответствии с приказом № 05/26 от 30.01.2026 года квалификационная комиссия в составе:', {}),
    p(`Председатель: директор — ${CHAIRMAN}`, {}),
    p(`Члены комиссии: эксперт — ${MEMBER_1}, преподаватель — ${MEMBER_2}`, { after: 120 }),
    p('приняла экзамен по пожарной безопасности в объёме пожарно-технического минимума и установила следующие результаты:', { after: 160 }),
    table(
      new TableRow({ tableHeader: true, children: [
        cell('№', { header: true, w: 500 }), cell('Фамилия, имя, отчество', { header: true, w: 3200 }),
        cell('Должность', { header: true, w: 2200 }), cell('Организация', { header: true, w: 2600 }),
        cell('Отметка о проверке знаний (прошёл, не прошёл)', { header: true, w: 2200 }), cell('Подпись', { header: true, w: 900 }),
      ]}),
      [new TableRow({ children: [
        cell('1', { center: true }), cell(d.fio), cell(d.position || '—'), cell(d.orgFullName),
        cell('прошёл', { center: true }), cell('', { center: true }),
      ]})],
    ),
    ...signatures(),
  ];
}

export function buildProtocolChildren(type: ProtocolType, d: ProtocolData): (Paragraph | Table)[] {
  if (type === 'pb') return buildPb(d);
  if (type === 'ptm') return buildPtm(d);
  return buildBiot(d);
}

function fileDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}
function safeName(s: string) { return (s || 'protocol').replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_').slice(0, 60); }
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** Generate & download a single protocol for a user + course. */
export async function downloadProtocol(args: {
  user: { id: string; name: string; position?: string; organization?: string; requestNumber?: string };
  course: { id: string; title: string };
}): Promise<void> {
  const { user, course } = args;
  const type = protocolTypeForCourse(course.title);
  const groupKey = protocolGroupKey(user);
  const number = await fetchProtocolNumber(groupKey, course.id);
  const data: ProtocolData = {
    fio: user.name,
    position: user.position || '—',
    orgFullName: user.organization || 'ТОО «____________»',
    protocolNo: number,
  };
  const doc = new Document({ sections: [{ children: buildProtocolChildren(type, data) }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `Протокол_${formatProtocolNo(number)}_${safeName(user.name)}_${fileDate()}.docx`);
}

/** Generate one Word file with a protocol page per passed course (used by the
 *  rep cabinet / admin to print everything for one employee at once). */
export async function downloadProtocolsBundle(args: {
  user: { id: string; name: string; position?: string; organization?: string; requestNumber?: string };
  courses: { id: string; title: string }[];
}): Promise<void> {
  const { user, courses } = args;
  if (courses.length === 0) return;
  const groupKey = protocolGroupKey(user);
  const sections = [] as any[];
  for (const course of courses) {
    const type = protocolTypeForCourse(course.title);
    const number = await fetchProtocolNumber(groupKey, course.id);
    const children = buildProtocolChildren(type, {
      fio: user.name,
      position: user.position || '—',
      orgFullName: user.organization || 'ТОО «____________»',
      protocolNo: number,
    });
    sections.push({ children });
  }
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  download(blob, `Протоколы_${safeName(user.name)}_${fileDate()}.docx`);
}
