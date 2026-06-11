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

// ─── Language (protocol is rendered in the UI's selected language) ──────────────
type Lang = 'ru' | 'kz' | 'en';
function curLang(): Lang {
  const l = (typeof localStorage !== 'undefined' && localStorage.getItem('kazskills_lang')) || 'ru';
  return l === 'kz' || l === 'en' ? l : 'ru';
}
const TRAINING_ORG_L: Record<Lang, string> = {
  ru: 'Товарищество с ограниченной ответственностью "STK services"',
  kz: '«STK services» жауапкершілігі шектеулі серіктестігі',
  en: '"STK services" Limited Liability Partnership',
};
const MONTHS_L: Record<Lang, string[]> = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kz: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
function localDate(lang: Lang, d = new Date()): string {
  const day = d.getDate(), m = MONTHS_L[lang][d.getMonth()], y = d.getFullYear();
  if (lang === 'kz') return `${y} жылғы «${day}» ${m}`;
  if (lang === 'en') return `${m} ${day}, ${y}`;
  return `«${day}» ${m} ${y} года`;
}
const SIG_LABELS: Record<Lang, { chair: string; member: string }> = {
  ru: { chair: 'Председатель комиссии:', member: 'Члены комиссии:' },
  kz: { chair: 'Комиссия төрағасы:', member: 'Комиссия мүшелері:' },
  en: { chair: 'Chairman of the commission:', member: 'Commission members:' },
};

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
  await renderProtocolsPdf([{ type, data }], `Протокол_${formatProtocolNo(number)}_${safeName(user.name)}_${fileDate()}.pdf`);
}

/** Generate ONE PDF with a protocol page per passed course (rep cabinet / admin). */
export async function downloadProtocolsBundle(args: {
  user: { id: string; name: string; position?: string; organization?: string; requestNumber?: string };
  courses: { id: string; title: string }[];
}): Promise<void> {
  const { user, courses } = args;
  if (courses.length === 0) return;
  const groupKey = protocolGroupKey(user);
  const pages: { type: ProtocolType; data: ProtocolData }[] = [];
  for (const course of courses) {
    const type = protocolTypeForCourse(course.title);
    const number = await fetchProtocolNumber(groupKey, course.id);
    pages.push({ type, data: {
      fio: user.name,
      position: user.position || '—',
      orgFullName: user.organization || 'ТОО «____________»',
      protocolNo: number,
    }});
  }
  await renderProtocolsPdf(pages, `Протоколы_${safeName(user.name)}_${fileDate()}.pdf`);
}

// ─── PDF generation (HTML → canvas → PDF) ──────────────────────────────────────
const dataUrl = (b64: string) => `data:image/png;base64,${b64}`;
function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface TypeConfig {
  appendix: string;
  title: (no: string) => string;
  subtitle?: string;
  introLines: (date: string) => string[];
  description?: (org: string) => string[];
  columns: string[];
  row: (d: ProtocolData) => string[];
}

const TYPE_CFG_ALL: Record<Lang, Record<ProtocolType, TypeConfig>> = {
  ru: {
    biot: {
      appendix: 'Приложение 2 к Правилам и срокам проведения обучения, инструктирования и проверок знаний по вопросам безопасности и охраны труда работников, руководителей и лиц, ответственных за обеспечение безопасности и охраны труда',
      title: (no) => `Протокол № ${no}`,
      subtitle: 'Заседания экзаменационной комиссии по проверке знаний по безопасности и охране труда работников',
      introLines: (date) => [
        `${date} Комиссия в составе:`,
        `Председатель: директор — ${CHAIRMAN}`,
        `Члены комиссии: эксперт — ${MEMBER_1}, преподаватель — ${MEMBER_2}`,
        'На основании приказа от «30» января 2026 г. №03/26 приняла экзамен и установила:',
        'Вид проверки: первичный',
      ],
      columns: ['№п/п', 'Фамилия, имя, отчество (при его наличии)', 'Должность', 'Наименование организации', 'Отметка о проверке знаний (прошёл, не прошёл)', 'Примеч.'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'прошёл', '—'],
    },
    pb: {
      appendix: 'Приложение 4 к Правилам подготовки, переподготовки и проверки знаний руководителей, специалистов и работников в области промышленной безопасности',
      title: (no) => `ПРОТОКОЛ № ${no}`,
      introLines: (date) => [
        `${date} Комиссия в составе:`,
        `Председатель: ${CHAIRMAN}`,
        `Члены комиссии: ${MEMBER_1}, ${MEMBER_2}`,
      ],
      description: (org) => [
        'Провели проверку знаний в объёме требований промышленной безопасности, установленных Законом РК «О гражданской защите», «Правил обеспечения промышленной безопасности» и нормативными правовыми актами Республики Казахстан:',
        `У сотрудника компании ${org}`,
        'По курсу «Промышленная безопасность на опасных производственных объектах» установили:',
      ],
      columns: ['№п/п', 'Фамилия, имя, отчество (при его наличии)', 'Должность', 'Образование', 'Заключение комиссии (сдал, не сдал)'],
      row: (d) => ['1', d.fio, d.position || '—', d.education || 'Среднее', 'Сдал'],
    },
    ptm: {
      appendix: 'Приложение 5 к Правилам обучения работников организаций и населения мерам пожарной безопасности и требованиям к содержанию учебных программ по обучению мерам пожарной безопасности',
      title: (no) => `Протокол № ${no}`,
      subtitle: 'заседания квалификационной комиссии по проверке знаний по пожарной безопасности в объёме пожарно-технического минимума',
      introLines: (date) => [
        `${date}`,
        'В соответствии с приказом № 05/26 от 30.01.2026 года квалификационная комиссия в составе:',
        `Председатель: директор — ${CHAIRMAN}`,
        `Члены комиссии: эксперт — ${MEMBER_1}, преподаватель — ${MEMBER_2}`,
        'приняла экзамен по пожарной безопасности в объёме пожарно-технического минимума и установила следующие результаты:',
      ],
      columns: ['№п/п', 'Фамилия, имя, отчество (при его наличии)', 'Должность', 'Организация', 'Отметка о проверке знаний (прошёл, не прошёл)', 'Подпись'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'прошёл', ''],
    },
  },
  kz: {
    biot: {
      appendix: 'Қызметкерлердің, басшылардың және еңбек қауіпсіздігі мен еңбекті қорғауды қамтамасыз етуге жауапты адамдардың еңбек қауіпсіздігі және еңбекті қорғау мәселелері бойынша оқытуды, нұсқаулық беруді және білімін тексеруді өткізу қағидалары мен мерзімдеріне 2-қосымша',
      title: (no) => `№ ${no} Хаттама`,
      subtitle: 'Қызметкерлердің еңбек қауіпсіздігі және еңбекті қорғау бойынша білімін тексеру жөніндегі емтихан комиссиясының отырысы',
      introLines: (date) => [
        `${date} мынадай құрамдағы комиссия:`,
        `Төраға: директор — ${CHAIRMAN}`,
        `Комиссия мүшелері: сарапшы — ${MEMBER_1}, оқытушы — ${MEMBER_2}`,
        '2026 жылғы «30» қаңтардағы №03/26 бұйрық негізінде емтихан қабылдап, мынаны белгіледі:',
        'Тексеру түрі: алғашқы',
      ],
      columns: ['р/с', 'Тегі, аты, әкесінің аты (бар болса)', 'Лауазымы', 'Ұйымның атауы', 'Білімін тексеру нәтижесі (өтті, өтпеді)', 'Ескерту'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'өтті', '—'],
    },
    pb: {
      appendix: 'Өнеркәсіптік қауіпсіздік саласындағы басшыларды, мамандарды және жұмысшыларды даярлау, қайта даярлау және білімін тексеру қағидаларына 4-қосымша',
      title: (no) => `№ ${no} ХАТТАМА`,
      introLines: (date) => [
        `${date} мынадай құрамдағы комиссия:`,
        `Төраға: ${CHAIRMAN}`,
        `Комиссия мүшелері: ${MEMBER_1}, ${MEMBER_2}`,
      ],
      description: (org) => [
        'ҚР «Азаматтық қорғау туралы» Заңында, «Өнеркәсіптік қауіпсіздікті қамтамасыз ету қағидаларында» және Қазақстан Республикасының нормативтік құқықтық актілерінде белгіленген өнеркәсіптік қауіпсіздік талаптары көлемінде білімін тексеруді жүргізді:',
        `${org} компаниясының қызметкерінде`,
        '«Қауіпті өндірістік объектілердегі өнеркәсіптік қауіпсіздік» курсы бойынша мынаны белгіледі:',
      ],
      columns: ['р/с', 'Тегі, аты, әкесінің аты (бар болса)', 'Лауазымы', 'Білімі', 'Комиссияның қорытындысы (тапсырды, тапсырмады)'],
      row: (d) => ['1', d.fio, d.position || '—', d.education || 'Орта', 'Тапсырды'],
    },
    ptm: {
      appendix: 'Ұйымдардың жұмысшыларын және халықты өрт қауіпсіздігі шараларына оқыту қағидаларына және өрт қауіпсіздігі шараларына оқыту жөніндегі оқу бағдарламаларының мазмұнына қойылатын талаптарға 5-қосымша',
      title: (no) => `№ ${no} Хаттама`,
      subtitle: 'өрт-техникалық минимум көлемінде өрт қауіпсіздігі бойынша білімін тексеру жөніндегі біліктілік комиссиясының отырысы',
      introLines: (date) => [
        `${date}`,
        '2026 жылғы 30.01.2026 №05/26 бұйрыққа сәйкес мынадай құрамдағы біліктілік комиссиясы:',
        `Төраға: директор — ${CHAIRMAN}`,
        `Комиссия мүшелері: сарапшы — ${MEMBER_1}, оқытушы — ${MEMBER_2}`,
        'өрт-техникалық минимум көлемінде өрт қауіпсіздігі бойынша емтихан қабылдап, мынадай нәтижелерді белгіледі:',
      ],
      columns: ['р/с', 'Тегі, аты, әкесінің аты (бар болса)', 'Лауазымы', 'Ұйым', 'Білімін тексеру нәтижесі (өтті, өтпеді)', 'Қолы'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'өтті', ''],
    },
  },
  en: {
    biot: {
      appendix: 'Appendix 2 to the Rules and terms for conducting training, instruction and knowledge assessment on occupational safety and health of employees, managers and persons responsible for ensuring occupational safety and health',
      title: (no) => `Protocol No. ${no}`,
      subtitle: 'Meeting of the examination commission for assessing employees’ knowledge of occupational safety and health',
      introLines: (date) => [
        `${date}. The commission composed of:`,
        `Chairman: director — ${CHAIRMAN}`,
        `Commission members: expert — ${MEMBER_1}, instructor — ${MEMBER_2}`,
        'On the basis of order No. 03/26 dated January 30, 2026, conducted the examination and established:',
        'Type of assessment: initial',
      ],
      columns: ['No.', 'Full name (if any)', 'Position', 'Name of organization', 'Knowledge check (passed, failed)', 'Notes'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'passed', '—'],
    },
    pb: {
      appendix: 'Appendix 4 to the Rules for preparation, retraining and knowledge assessment of managers, specialists and workers in the field of industrial safety',
      title: (no) => `PROTOCOL No. ${no}`,
      introLines: (date) => [
        `${date}. The commission composed of:`,
        `Chairman: ${CHAIRMAN}`,
        `Commission members: ${MEMBER_1}, ${MEMBER_2}`,
      ],
      description: (org) => [
        'Conducted a knowledge assessment within the scope of industrial safety requirements established by the RK Law “On Civil Protection”, the “Rules for ensuring industrial safety” and the regulatory legal acts of the Republic of Kazakhstan:',
        `For the employee of company ${org}`,
        'For the course “Industrial safety at hazardous production facilities” established:',
      ],
      columns: ['No.', 'Full name (if any)', 'Position', 'Education', 'Commission conclusion (passed, failed)'],
      row: (d) => ['1', d.fio, d.position || '—', d.education || 'Secondary', 'Passed'],
    },
    ptm: {
      appendix: 'Appendix 5 to the Rules for training employees of organizations and the population in fire safety measures and the requirements for the content of training programs on fire safety measures',
      title: (no) => `Protocol No. ${no}`,
      subtitle: 'meeting of the qualification commission for assessing fire safety knowledge within the scope of the fire-technical minimum',
      introLines: (date) => [
        `${date}`,
        'In accordance with order No. 05/26 dated 30.01.2026, the qualification commission composed of:',
        `Chairman: director — ${CHAIRMAN}`,
        `Commission members: expert — ${MEMBER_1}, instructor — ${MEMBER_2}`,
        'conducted the fire safety examination within the scope of the fire-technical minimum and established the following results:',
      ],
      columns: ['No.', 'Full name (if any)', 'Position', 'Organization', 'Knowledge check (passed, failed)', 'Signature'],
      row: (d) => ['1', d.fio, d.position || '—', d.orgFullName, 'passed', ''],
    },
  },
};

function protocolHtml(type: ProtocolType, d: ProtocolData): string {
  const lang = curLang();
  const cfg = (TYPE_CFG_ALL[lang] ?? TYPE_CFG_ALL.ru)[type];
  const date = localDate(lang, d.date ?? new Date());
  const sig = SIG_LABELS[lang];
  const no = formatProtocolNo(d.protocolNo);
  const intro = cfg.introLines(date).map(l => `<div style="margin-bottom:4px;">${esc(l)}</div>`).join('');
  const desc = cfg.description ? cfg.description(d.orgFullName).map(l => `<div style="margin-bottom:4px;">${esc(l)}</div>`).join('') : '';
  const ths = cfg.columns.map(c => `<th style="border:1px solid #000;padding:6px;font-size:11px;font-weight:bold;text-align:center;vertical-align:middle;background:#eef2f8;">${esc(c)}</th>`).join('');
  const tds = cfg.row(d).map((v, i) => `<td style="border:1px solid #000;padding:8px 6px;font-size:12px;text-align:${i === 0 ? 'center' : 'left'};vertical-align:middle;">${esc(v)}</td>`).join('');

  return `
  <div style="width:720px;box-sizing:border-box;padding:40px 44px;background:#fff;color:#000;font-family:'Times New Roman',Georgia,serif;font-size:13px;line-height:1.45;">
    <div style="font-size:10px;font-style:italic;text-align:right;margin-bottom:18px;line-height:1.35;">${esc(cfg.appendix)}</div>
    <div style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:8px;">${esc(cfg.title(no))}</div>
    ${cfg.subtitle ? `<div style="text-align:center;font-weight:bold;margin-bottom:8px;">${esc(cfg.subtitle)}</div>` : ''}
    <div style="text-align:center;font-weight:bold;margin-bottom:16px;">${esc(TRAINING_ORG_L[lang])}</div>
    ${intro}
    ${desc ? `<div style="margin-top:6px;">${desc}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:14px;">
      <thead><tr>${ths}</tr></thead>
      <tbody><tr>${tds}</tr></tbody>
    </table>
    <div style="position:relative;margin-top:34px;min-height:180px;">
      <!-- Stamp sits behind; signatures (z-index 1) show above it -->
      <img src="${dataUrl(STAMP_B64)}" style="position:absolute;left:330px;top:40px;width:150px;height:${Math.round(150 * STAMP_H / STAMP_W)}px;opacity:0.85;z-index:0;"/>
      <table style="border-collapse:collapse;position:relative;z-index:1;">
        <tr>
          <td style="padding:8px 0;white-space:nowrap;vertical-align:middle;">${esc(sig.chair)}</td>
          <td style="padding:8px 18px;white-space:nowrap;vertical-align:middle;">${esc(CHAIRMAN)}</td>
          <td style="padding:8px 0;vertical-align:middle;"><img src="${dataUrl(SIG_CHAIR_B64)}" style="height:34px;display:block;"/></td>
        </tr>
        <tr>
          <td style="padding:8px 0;white-space:nowrap;vertical-align:middle;">${esc(sig.member)}</td>
          <td style="padding:8px 18px;white-space:nowrap;vertical-align:middle;">${esc(MEMBER_1)}</td>
          <td style="padding:8px 0;vertical-align:middle;"><img src="${dataUrl(SIG_M1_B64)}" style="height:40px;display:block;"/></td>
        </tr>
        <tr>
          <td style="padding:8px 0;white-space:nowrap;vertical-align:middle;">${esc(sig.member)}</td>
          <td style="padding:8px 18px;white-space:nowrap;vertical-align:middle;">${esc(MEMBER_2)}</td>
          <td style="padding:8px 0;vertical-align:middle;"><img src="${dataUrl(SIG_M2_B64)}" style="height:34px;display:block;"/></td>
        </tr>
      </table>
    </div>
  </div>`;
}

async function renderProtocolsPdf(pages: { type: ProtocolType; data: ProtocolData }[], filename: string): Promise<void> {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297
  const margin = 8;

  for (let i = 0; i < pages.length; i++) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
    host.innerHTML = protocolHtml(pages[i].type, pages[i].data);
    document.body.appendChild(host);
    const node = host.firstElementChild as HTMLElement;
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const img = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', margin, margin, imgW, Math.min(imgH, pageH - margin * 2));
    } finally {
      document.body.removeChild(host);
    }
  }
  pdf.save(filename);
}
