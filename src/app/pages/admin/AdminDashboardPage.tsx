import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router';
import { useUsers, type ManagedUser, type BatchUserInput } from '../../context/UsersContext';
import { useCourses, UserProgress, sortCourses } from '../../context/CoursesContext';
import { CourseAssignPicker } from '../../components/shared/CourseAssignPicker';
import { getCurrentOrganization, slugForLegacyOrgName } from '../../lib/organization';
import { useOrganizationsContext } from '../../context/OrganizationsContext';
import { htmlToPdf } from '../../lib/reportPdf';
import {
  IcUserPlus, IcPlus, IcClose, IcChevronDown, IcTeam,
  IcBook, IcDocument, IcCheck, IcDownload, IcTrash,
  IcCheckCircle, IcBuilding, IcBriefcase, IcWarning,
} from '../../components/Icons';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun,
} from 'docx';
import { LOGO_B64, LOGO_DATA_URL } from '../../assets/logo';

const NAVY  = '#1B3D84';
const BLUE  = '#2B5CE6';
const BORDER = '#E8ECF6';
const MUTED  = '#6B7280';

// ─── Logo for generated documents (Word + PDF) ─────────────────────────────────
function logoBytes(): Uint8Array {
  const bin = atob(LOGO_B64);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
function logoWordPara(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 140 },
    children: [new ImageRun({ type: 'png', data: logoBytes(), transformation: { width: 60, height: 60 } })],
  });
}
const LOGO_IMG_HTML = `<div style="text-align:center;margin-bottom:8px;"><img src="${LOGO_DATA_URL}" style="width:58px;height:58px;border-radius:50%;"/></div>`;

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
  // Split on "\n" so multi-line strings render as multiple paragraphs
  // inside the same table cell (one paragraph per item — used in the
  // "Назначенные курсы" column of the credentials report).
  const lines = String(text ?? '').split('\n');
  return new TableCell({
    children: lines.map(line => new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: line, size: 20 })],
    })),
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

// Helper: whether the user is enrolled in this course.
const isEnrolled = (u: ManagedUser, courseId: string) =>
  (u.enrolledCourses ?? []).includes(courseId);

async function generateZayavka(
  org: string,
  users: ManagedUser[],
  courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>,
  requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org
    && (!requestNum || u.requestNumber === requestNum));
  // Only courses that have at least one student enrolled — no point listing
  // a course nobody from this batch needs.
  const relevant = courses
    .filter(c => c.published)
    .filter(c => students.some(u => isEnrolled(u, c.id)));

  const children: (Paragraph | Table)[] = [
    logoWordPara(),
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
  } else if (relevant.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Ни одному слушателю не назначены курсы.', size: 22, color: 'CC0000' })] }));
  }

  for (const course of relevant) {
    const enrolledStudents = students.filter(u => isEnrolled(u, course.id));
    if (enrolledStudents.length === 0) continue;

    children.push(new Paragraph({
      spacing: { before: 500, after: 160 },
      children: [new TextRun({ text: `«${course.title}»`, bold: true, size: 24 })],
    }));
    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 600), hdrCell('Ф. И. О', 3000),
        hdrCell('Должность', 2400), hdrCell('Дата прохождения курса', 2400),
      ],
    });
    const rows = enrolledStudents.map((u, i) => {
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
    && (!requestNum || u.requestNumber === requestNum))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  const published = courses.filter(c => c.published);
  const titleById = new Map(published.map(c => [c.id, c.title]));

  const children: (Paragraph | Table)[] = [
    logoWordPara(),
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
  } else {
    // One unified table: each row = one user. The "Назначенные курсы" column
    // lists the titles of the courses assigned to that user.
    const hdr = new TableRow({
      tableHeader: true,
      children: [
        hdrCell('№', 500),
        hdrCell('Ф. И. О', 2600),
        hdrCell('Должность', 2000),
        hdrCell('Логин', 1500),
        hdrCell('Пароль', 1100),
        hdrCell('Назначенные курсы', 3000),
      ],
    });
    const rows = students.map((u, i) => {
      const titles = (u.enrolledCourses ?? [])
        .map(id => titleById.get(id))
        .filter(Boolean) as string[];
      const coursesText = titles.length > 0
        ? titles.map((t, idx) => `${idx + 1}. ${t}`).join('\n')
        : '—';
      return new TableRow({ children: [
        dataCell(String(i + 1), true),
        dataCell(u.name),
        dataCell(u.position || '—'),
        dataCell(u.email),
        dataCell(u.password || '—'),
        dataCell(coursesText),
      ]});
    });
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
  // Only courses that are assigned to at least one student in the report —
  // no point showing a column nobody uses.
  const relevant = courses
    .filter(c => c.published)
    .filter(c => students.some(u => isEnrolled(u, c.id)));

  const children: (Paragraph | Table)[] = [
    logoWordPara(),
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

  if (students.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Слушатели не найдены.', size: 22, color: 'CC0000' })] }));
  } else if (relevant.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Ни одному слушателю не назначены курсы.', size: 22, color: 'CC0000' })] }));
  } else {
    const colW = Math.floor(5000 / relevant.length);
    const hdrCells = [
      hdrCell('№', 600), hdrCell('Ф. И. О', 2400),
      ...relevant.map(c => hdrCell(c.title, colW)),
    ];
    const hdr = new TableRow({ tableHeader: true, children: hdrCells });

    const rows = students.map((u, i) => {
      const cells = [
        dataCell(String(i + 1), true), dataCell(u.name),
        ...relevant.map(c => {
          if (!isEnrolled(u, c.id)) return dataCell('—', true); // not assigned
          const prog = progressMap[`${u.id}:${c.id}`];
          if (!prog || prog.attempts.length === 0) return dataCell('не сдавал', true);
          const best = prog.attempts.filter(a => a.passed).sort((a, b) => b.score - a.score)[0]
            ?? prog.attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
          return dataCell(best ? `${Math.round(best.score)}%` : '—', true);
        }),
      ];
      return new TableRow({ children: cells });
    });

    children.push(makeTable(hdr, rows));

    // Legend so the reader doesn't guess what "—" vs "не сдавал" means.
    children.push(new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({
        text: '«—» — курс не назначен слушателю. «не сдавал» — курс назначен, но попыток ещё не было. «N%» — лучший результат из сданных попыток.',
        size: 18, italics: true, color: '6B7280',
      })],
    }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Статистика_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.docx`);
}

// ─── PDF versions (open everywhere, clickable login link) ──────────────────────
function escHtml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function reportSiteUrl(org: string) {
  const slug = slugForLegacyOrgName(org);
  return slug ? `https://${slug}.kazskills.kz` : 'https://kazskills.kz';
}
const RPT_HEAD = `font-family:Arial,Helvetica,sans-serif;color:#0F1629;`;
const RPT_TH = `border:1px solid #1B3D84;background:#1B3D84;color:#fff;padding:7px 6px;font-size:12px;font-weight:bold;text-align:center;`;
const RPT_TD = `border:1px solid #c9d2e3;padding:7px 6px;font-size:12.5px;vertical-align:top;`;

async function generateLoginsPasswordsPdf(
  org: string, users: ManagedUser[], courses: ReturnType<typeof useCourses>['courses'], requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org && (!requestNum || u.requestNumber === requestNum))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  const titleById = new Map(courses.filter(c => c.published).map(c => [c.id, c.title]));
  const url = reportSiteUrl(org);

  const rows = students.map((u, i) => {
    const titles = (u.enrolledCourses ?? []).map(id => titleById.get(id)).filter(Boolean) as string[];
    const coursesHtml = titles.length ? titles.map((t, k) => `${k + 1}. ${escHtml(t)}`).join('<br>') : '—';
    return `<tr>
      <td style="${RPT_TD}text-align:center;">${i + 1}</td>
      <td style="${RPT_TD}">${escHtml(u.name)}</td>
      <td style="${RPT_TD}">${escHtml(u.position || '—')}</td>
      <td style="${RPT_TD}font-weight:bold;">${escHtml(u.email)}</td>
      <td style="${RPT_TD}font-weight:bold;">${escHtml(u.password || '—')}</td>
      <td style="${RPT_TD}">${coursesHtml}</td>
    </tr>`;
  }).join('');

  const html = `<div style="width:760px;box-sizing:border-box;padding:34px 36px;background:#fff;${RPT_HEAD}">
    ${LOGO_IMG_HTML}<div style="font-size:22px;font-weight:bold;margin-bottom:10px;">Логины и пароли</div>
    <div style="font-size:14px;font-weight:bold;">Организация: ${escHtml(org)}</div>
    ${requestNum ? `<div style="font-size:14px;font-weight:bold;">Номер заявки: ${escHtml(requestNum)}</div>` : ''}
    <div style="font-size:12.5px;color:#666;margin-bottom:8px;">Дата формирования: ${todayStr()}</div>
    <div style="font-size:13px;margin-bottom:16px;">Ссылка для входа: <span id="login-url" style="color:#2B5CE6;text-decoration:underline;font-weight:bold;">${url}</span></div>
    ${students.length === 0
      ? `<div style="color:#CC0000;">Слушатели не найдены.</div>`
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="${RPT_TH}width:34px;">№</th><th style="${RPT_TH}">Ф. И. О</th>
            <th style="${RPT_TH}">Должность</th><th style="${RPT_TH}">Логин</th>
            <th style="${RPT_TH}">Пароль</th><th style="${RPT_TH}">Назначенные курсы</th>
          </tr></thead><tbody>${rows}</tbody></table>`}
  </div>`;

  await htmlToPdf(html, `Логины_пароли_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.pdf`, [{ selector: '#login-url', url }]);
}

async function generateStatistikaPdf(
  org: string, users: ManagedUser[], courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>, requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org && (!requestNum || u.requestNumber === requestNum));
  const relevant = courses.filter(c => c.published).filter(c => students.some(u => isEnrolled(u, c.id)));

  const headCols = relevant.map(c => `<th style="${RPT_TH}">${escHtml(c.title)}</th>`).join('');
  const rows = students.map((u, i) => {
    const cells = relevant.map(c => {
      if (!isEnrolled(u, c.id)) return `<td style="${RPT_TD}text-align:center;">—</td>`;
      const prog = progressMap[`${u.id}:${c.id}`];
      if (!prog || prog.attempts.length === 0) return `<td style="${RPT_TD}text-align:center;">не сдавал</td>`;
      const best = prog.attempts.filter(a => a.passed).sort((a, b) => b.score - a.score)[0]
        ?? prog.attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      return `<td style="${RPT_TD}text-align:center;font-weight:bold;">${best ? `${Math.round(best.score)}%` : '—'}</td>`;
    }).join('');
    return `<tr><td style="${RPT_TD}text-align:center;">${i + 1}</td><td style="${RPT_TD}">${escHtml(u.name)}</td>${cells}</tr>`;
  }).join('');

  const body = (students.length === 0)
    ? `<div style="color:#CC0000;">Слушатели не найдены.</div>`
    : (relevant.length === 0)
      ? `<div style="color:#CC0000;">Ни одному слушателю не назначены курсы.</div>`
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr><th style="${RPT_TH}width:34px;">№</th><th style="${RPT_TH}">Ф. И. О</th>${headCols}</tr></thead>
          <tbody>${rows}</tbody></table>
         <div style="font-size:11px;color:#6B7280;font-style:italic;margin-top:10px;">«—» — курс не назначен. «не сдавал» — назначен, но попыток не было. «N%» — лучший результат.</div>`;

  const html = `<div style="width:760px;box-sizing:border-box;padding:34px 36px;background:#fff;${RPT_HEAD}">
    ${LOGO_IMG_HTML}<div style="font-size:22px;font-weight:bold;margin-bottom:10px;">Статистика</div>
    <div style="font-size:14px;font-weight:bold;">Организация: ${escHtml(org)}</div>
    ${requestNum ? `<div style="font-size:14px;font-weight:bold;">Номер заявки: ${escHtml(requestNum)}</div>` : ''}
    <div style="font-size:12.5px;color:#666;margin-bottom:16px;">Дата формирования: ${todayStr()}</div>
    ${body}
  </div>`;

  await htmlToPdf(html, `Статистика_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.pdf`);
}

async function generateZayavkaPdf(
  org: string, users: ManagedUser[], courses: ReturnType<typeof useCourses>['courses'],
  progressMap: Record<string, UserProgress | null>, requestNum?: string,
) {
  const students = users.filter(u => u.role === 'student' && u.organization === org && (!requestNum || u.requestNumber === requestNum));
  const relevant = courses.filter(c => c.published).filter(c => students.some(u => isEnrolled(u, c.id)));

  const blocks = relevant.map(course => {
    const enrolled = students.filter(u => isEnrolled(u, course.id));
    if (enrolled.length === 0) return '';
    const rows = enrolled.map((u, i) => {
      const prog = progressMap[`${u.id}:${course.id}`];
      const passing = prog?.attempts?.filter(a => a.passed).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      const date = passing ? fmtDate(passing.completedAt) : '—';
      return `<tr><td style="${RPT_TD}text-align:center;">${i + 1}</td><td style="${RPT_TD}">${escHtml(u.name)}</td><td style="${RPT_TD}">${escHtml(u.position || '—')}</td><td style="${RPT_TD}text-align:center;">${date}</td></tr>`;
    }).join('');
    return `<div style="font-size:14px;font-weight:bold;margin:18px 0 8px;">«${escHtml(course.title)}»</div>
      <table style="width:100%;border-collapse:collapse;"><thead><tr>
        <th style="${RPT_TH}width:34px;">№</th><th style="${RPT_TH}">Ф. И. О</th>
        <th style="${RPT_TH}">Должность</th><th style="${RPT_TH}">Дата прохождения курса</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }).join('');

  const html = `<div style="width:760px;box-sizing:border-box;padding:34px 36px;background:#fff;${RPT_HEAD}">
    ${LOGO_IMG_HTML}<div style="font-size:22px;font-weight:bold;margin-bottom:10px;">Заявка</div>
    <div style="font-size:14px;font-weight:bold;">Организация: ${escHtml(org)}</div>
    ${requestNum ? `<div style="font-size:14px;font-weight:bold;">Номер заявки: ${escHtml(requestNum)}</div>` : ''}
    <div style="font-size:12.5px;color:#666;margin-bottom:8px;">Дата формирования: ${todayStr()}</div>
    ${students.length === 0 ? `<div style="color:#CC0000;">Слушатели не найдены.</div>` : (relevant.length === 0 ? `<div style="color:#CC0000;">Ни одному слушателю не назначены курсы.</div>` : blocks)}
  </div>`;

  await htmlToPdf(html, `Заявка_${org}${requestNum ? `_${requestNum}` : ''}_${fileDate()}.pdf`);
}

// ─── Word export for batch credentials ────────────────────────────────────────
async function exportBatchCredentials(
  requestNumber: string,
  org: string,
  createdUsersInput: { name: string; login: string; password: string }[],
  tenantSlug?: string | null,
) {
  const createdUsers = [...createdUsersInput].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  const siteUrl = tenantSlug
    ? `https://${tenantSlug}.kazskills.kz`
    : 'https://kazskills.kz';

  const children: (Paragraph | Table)[] = [
    logoWordPara(),
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

    // ── Instruction section ────────────────────────────────────────────────
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: 'Краткая инструкция по входу', bold: true, size: 26 })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: '1. Откройте в браузере ссылку: ', size: 22 }),
        new TextRun({ text: siteUrl, size: 22, bold: true, color: '1B3D84' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '2. Введите логин и пароль из таблицы ниже.', size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '3. Нажмите кнопку «Войти».', size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '4. В разделе «Мои курсы» выберите назначенный вам курс, изучите материалы и пройдите итоговый тест.', size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '5. После успешной сдачи теста сертификат появится в разделе «Сертификаты».', size: 22 })],
    }),
    // Support block (per client doc)
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: 'Служба поддержки', bold: true, size: 24 })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: 'Если возникнут вопросы или технические сложности — напишите нам в WhatsApp: +7 (771) 615-84-28 (или воспользуйтесь кнопкой чата на сайте).', size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: 'В сообщении укажите: ФИО, название организации и должность, описание возникших сложностей.', size: 20, italics: true, color: '6B7280' })],
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

// PDF version of the credentials sheet — opens on any phone (incl. old ones) and the
// login link is a real tappable hyperlink.
async function exportBatchCredentialsPdf(
  requestNumber: string,
  org: string,
  createdUsersInput: { name: string; login: string; password: string }[],
  tenantSlug?: string | null,
) {
  const createdUsers = [...createdUsersInput].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  const siteUrl = tenantSlug ? `https://${tenantSlug}.kazskills.kz` : 'https://kazskills.kz';

  const rows = createdUsers.map((u, i) => `<tr>
    <td style="${RPT_TD}text-align:center;">${i + 1}</td>
    <td style="${RPT_TD}">${escHtml(u.name)}</td>
    <td style="${RPT_TD}font-weight:bold;">${escHtml(u.login)}</td>
    <td style="${RPT_TD}font-weight:bold;">${escHtml(u.password)}</td>
  </tr>`).join('');

  const html = `<div style="width:760px;box-sizing:border-box;padding:34px 36px;background:#fff;${RPT_HEAD}">
    ${LOGO_IMG_HTML}<div style="font-size:22px;font-weight:bold;margin-bottom:10px;">Логины и пароли</div>
    <div style="font-size:14px;font-weight:bold;">Организация: ${escHtml(org)}</div>
    <div style="font-size:14px;font-weight:bold;">Номер заявки: ${escHtml(requestNumber)}</div>
    <div style="font-size:12.5px;color:#666;margin-bottom:14px;">Дата формирования: ${todayStr()}</div>

    <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">Краткая инструкция по входу</div>
    <div style="font-size:13px;line-height:1.7;margin-bottom:14px;">
      1. Откройте в браузере ссылку: <span id="login-url" style="color:#1B3D84;text-decoration:underline;font-weight:bold;">${siteUrl}</span><br>
      2. Введите логин и пароль из таблицы ниже.<br>
      3. Нажмите кнопку «Войти».<br>
      4. В разделе «Мои курсы» выберите назначенный курс, изучите материалы и пройдите итоговый тест.<br>
      5. После успешной сдачи теста протокол появится в разделе «Протоколы».
    </div>
    <div style="font-size:12.5px;color:#374151;margin-bottom:16px;">
      <b>Служба поддержки:</b> при вопросах напишите в WhatsApp +7 (771) 615-84-28 (или кнопка чата на сайте). Укажите ФИО, организацию, должность и описание проблемы.
    </div>

    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${RPT_TH}width:34px;">№</th><th style="${RPT_TH}">Ф. И. О</th>
        <th style="${RPT_TH}">Логин</th><th style="${RPT_TH}">Пароль</th>
      </tr></thead><tbody>${rows}</tbody>
    </table>
  </div>`;

  await htmlToPdf(html, `Логины_пароли_заявка_${requestNumber}_${fileDate()}.pdf`, [{ selector: '#login-url', url: siteUrl }]);
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

// Monotonic id generator — guarantees unique row ids even when many rows are added
// in the same millisecond (the old `Date.now()` scheme produced duplicate React keys,
// which corrupted input state at scale).
let _empSeq = 0;
function mkEmpId(): string { return 'e' + (++_empSeq); }

// ─── Draft persistence (so a crash / accidental close never loses 400 rows) ─────
interface BatchDraft {
  step: number;
  requestNumber: string;
  org: string;
  customOrg: boolean;
  department: string;
  employees: EmployeeRow[];
  courseMode: 'all' | 'individual';
  globalCourses: string[];
  savedAt: string;
}
function batchDraftKey(): string {
  const org = getCurrentOrganization();
  return `kazskills_batch_draft_${org?.slug ?? 'root'}`;
}
function loadBatchDraft(): BatchDraft | null {
  try {
    const raw = localStorage.getItem(batchDraftKey());
    return raw ? (JSON.parse(raw) as BatchDraft) : null;
  } catch { return null; }
}
function draftHasContent(d: BatchDraft | null): boolean {
  if (!d) return false;
  return !!(d.requestNumber?.trim() || d.department?.trim()
    || (d.globalCourses?.length)
    || (d.employees ?? []).some(e => e.name?.trim() || e.position?.trim() || e.courses?.length));
}
function clearBatchDraft() {
  try { localStorage.removeItem(batchDraftKey()); } catch { /* ignore */ }
}

// ─── Memoised employee row — only the edited row re-renders, not all 400 ────────
const EmployeeRowItem = memo(function EmployeeRowItem({
  emp, index, hasError, canRemove, onUpdate, onRemove,
}: {
  emp: EmployeeRow;
  index: number;
  hasError: boolean;
  canRemove: boolean;
  onUpdate: (id: string, field: keyof EmployeeRow, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 1fr 34px', gap: 8, alignItems: 'start',
      padding: '10px 12px', borderRadius: 10,
      border: `1px solid ${hasError ? '#FECACA' : '#E3E7F0'}`,
      background: hasError ? '#FFF7F7' : '#FAFBFF',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: NAVY,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 3,
      }}>
        {index + 1}
      </div>
      <div>
        <input
          value={emp.name}
          onChange={e => onUpdate(emp.id, 'name', e.target.value)}
          placeholder="ФИО *"
          style={{ ...inputStyle, fontSize: 13, borderColor: hasError ? '#DC2626' : '#E3E7F0' }}
        />
        {hasError && <span style={{ fontSize: 10.5, color: '#DC2626' }}>Введите ФИО</span>}
      </div>
      <div>
        <input
          value={emp.position}
          onChange={e => onUpdate(emp.id, 'position', e.target.value)}
          placeholder="Должность"
          style={{ ...inputStyle, fontSize: 13 }}
        />
      </div>
      <button
        onClick={() => onRemove(emp.id)}
        disabled={!canRemove}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: '1px solid #E3E7F0', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: canRemove ? 'pointer' : 'not-allowed',
          opacity: canRemove ? 1 : 0.3, marginTop: 2,
        }}
      >
        <IcTrash size={13} color="#DC2626" />
      </button>
    </div>
  );
});

function BatchCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addUsersBatch } = useUsers();
  const { courses } = useCourses();
  const [batchCourseSearch, setBatchCourseSearch] = useState('');
  const { users } = useUsers();
  const publishedCourses = sortCourses(courses.filter(c => c.published));
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
    { id: mkEmpId(), name: '', position: '', login: genLogin6(), password: genPassword4(), courses: [] },
  ]);
  // Bulk paste (the realistic way to enter hundreds of people without typing 400 rows)
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // Step 3
  const [courseMode, setCourseMode] = useState<'all' | 'individual'>('all');
  const [globalCourses, setGlobalCourses] = useState<string[]>([]);

  // Step 4
  const [created, setCreated] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<ManagedUser[]>([]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Draft state
  const [restoredDraft, setRestoredDraft] = useState<BatchDraft | null>(null);
  const [draftSavedNote, setDraftSavedNote] = useState(false);
  // Tracks "already created" synchronously so a debounced autosave that fires AFTER
  // handleCreate can't resurrect the (now cleared) draft of an already-created заявка.
  const createdRef = useRef(false);

  const buildDraft = (): BatchDraft => ({
    step, requestNumber, org, customOrg, department,
    employees, courseMode, globalCourses,
    savedAt: new Date().toISOString(),
  });
  const writeDraft = () => {
    try { localStorage.setItem(batchDraftKey(), JSON.stringify(buildDraft())); } catch { /* quota — ignore */ }
  };

  const freshState = () => {
    setStep(1);
    setRequestNumber('');
    setOrg(tenantOrg?.fullName ?? '');
    setCustomOrg(false);
    setDepartment('');
    setEmployees([{ id: mkEmpId(), name: '', position: '', login: genLogin6(), password: genPassword4(), courses: [] }]);
    setCourseMode('all');
    setGlobalCourses([]);
    setCreated(false);
    setCreatedUsers([]);
    setErrors({});
    setBulkText('');
    setShowBulk(false);
  };

  // On open: restore an existing draft if one has real content, else start fresh.
  useEffect(() => {
    if (!open) return;
    createdRef.current = false;       // a freshly opened session is not "created" yet
    const draft = loadBatchDraft();
    if (draftHasContent(draft) && draft) {
      setStep(draft.step ?? 1);
      setRequestNumber(draft.requestNumber ?? '');
      setOrg(draft.org ?? (tenantOrg?.fullName ?? ''));
      setCustomOrg(!!draft.customOrg);
      setDepartment(draft.department ?? '');
      // Re-id every restored row so ids are guaranteed unique this session.
      setEmployees((draft.employees ?? []).map(r => ({ ...r, id: mkEmpId() })));
      setCourseMode(draft.courseMode ?? 'all');
      setGlobalCourses(draft.globalCourses ?? []);
      setCreated(false);
      setCreatedUsers([]);
      setErrors({});
      setBulkText('');
      setShowBulk(false);
      setRestoredDraft(draft);
    } else {
      freshState();
      setRestoredDraft(null);
    }
  }, [open]);

  // Autosave (debounced) — persists the wizard so closing / a crash / a refresh
  // never loses the entered data. Cleared only on successful create or "Начать заново".
  useEffect(() => {
    if (!open || created) return;
    const h = setTimeout(() => {
      if (createdRef.current) return;   // создано после запуска таймера — не воскрешаем черновик
      writeDraft();
    }, 600);
    return () => clearTimeout(h);
  }, [open, created, step, requestNumber, org, customOrg, department, employees, courseMode, globalCourses]);

  const saveDraftNow = () => {
    writeDraft();
    setDraftSavedNote(true);
    setTimeout(() => setDraftSavedNote(false), 2200);
  };

  const startOver = () => {
    clearBatchDraft();
    freshState();
    setRestoredDraft(null);
  };

  // ── Employee management ── (stable callbacks → memoised rows skip re-render)
  // NOTE: these are hooks (useCallback) so they MUST run on every render —
  // keep them ABOVE the `if (!open) return null` early return (React error #310).
  const addEmployee = useCallback(() => {
    setEmployees(prev => [...prev, {
      id: mkEmpId(),
      name: '', position: '',
      login: genLogin6(), password: genPassword4(),
      courses: [],
    }]);
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.length <= 1 ? prev : prev.filter(e => e.id !== id));
  }, []);

  const updateEmployee = useCallback((id: string, field: keyof EmployeeRow, value: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    if (field === 'name') {
      setErrors(prev => {
        if (!prev[`emp_${id}`]) return prev;
        const n = { ...prev }; delete n[`emp_${id}`]; return n;
      });
    }
  }, []);

  if (!open) return null;

  // ── Step 1 validation ──
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!requestNumber.trim()) e.requestNumber = 'Введите номер заявки';
    if (!org.trim()) e.org = 'Выберите организацию';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 2 validation ── (errors keyed by row id, not index, so a memoised row
  // stays pure and we never re-scan the whole list on each keystroke)
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    employees.forEach(emp => {
      if (!emp.name.trim()) e[`emp_${emp.id}`] = 'ФИО';
    });
    if (employees.length === 0) e.employees = 'Добавьте хотя бы одного сотрудника';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Bulk paste: one person per line; optional "ФИО | Должность" / "ФИО, Должность".
  const applyBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const rows: EmployeeRow[] = lines.map(line => {
      // Split on the FIRST separator only (so a position like "Инженер, 1 кат." survives).
      let name = line, position = '';
      const sep = line.search(/[|;\t]/);
      const cut = sep >= 0 ? sep : line.indexOf(',');
      if (cut >= 0) { name = line.slice(0, cut); position = line.slice(cut + 1); }
      return {
        id: mkEmpId(),
        name: name.trim(),
        position: position.trim(),
        login: genLogin6(), password: genPassword4(),
        courses: [],
      };
    });
    // Replace the lone empty seed row, otherwise append.
    setEmployees(prev => {
      const base = prev.length === 1 && !prev[0].name.trim() && !prev[0].position.trim() ? [] : prev;
      return [...base, ...rows];
    });
    setBulkText('');
    setShowBulk(false);
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
    if (step === 3) {
      // Before review/export: make every generated login unique vs existing users
      // AND within this batch, so the shown & exported logins match what gets saved
      // (prevents the random generator colliding with an existing login).
      const taken = new Set(users.map(u => u.email));
      setEmployees(prev => prev.map(e => {
        let login = e.login;
        while (!/^\d{6}$/.test(login) || taken.has(login)) login = genLogin6();
        taken.add(login);
        return login === e.login ? e : { ...e, login };
      }));
    }
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
    createdRef.current = true;   // block any in-flight autosave from re-writing the draft
    setCreated(true);
    clearBatchDraft();          // success → discard the draft
  };

  // ── Export credentials ──
  const credentialList = () => employees.map(emp => ({ name: emp.name, login: emp.login, password: emp.password }));
  const handleExport = () => {
    exportBatchCredentials(requestNumber, org, credentialList(), tenantOrg?.slug ?? null);
  };
  const handleExportPdf = () => {
    exportBatchCredentialsPdf(requestNumber, org, credentialList(), tenantOrg?.slug ?? null);
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

  // Has the user entered anything worth protecting? If so, a stray backdrop tap
  // must NOT close the wizard (this was a prime cause of "окно свернулось, всё пропало").
  const hasContent = !!(requestNumber.trim() || department.trim() || globalCourses.length
    || employees.some(e => e.name.trim() || e.position.trim() || e.courses.length));

  // Closing flushes the draft synchronously (the autosave is debounced 600ms, so a
  // quick close right after typing would otherwise drop the last edits).
  const closeModal = () => {
    if (!created && hasContent) writeDraft();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,22,41,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget && !created && !hasContent) onClose(); }}
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
          <button onClick={closeModal}
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

          {/* Restored-draft banner */}
          {restoredDraft && !created && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              marginBottom: 16, padding: '10px 14px', borderRadius: 10,
              background: '#FFFBEB', border: '1px solid #FDE68A',
            }}>
              <IcCheckCircle size={16} color="#D97706" />
              <div style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: '#92400E' }}>
                Восстановлен черновик заявки — продолжайте с того же места.
              </div>
              <button onClick={startOver}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: '1.5px solid #FDE68A',
                  background: '#fff', color: '#92400E', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                Начать заново
              </button>
            </div>
          )}

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, color: MUTED, flex: '1 1 200px' }}>
                  Добавьте сотрудников. Логин и пароль генерируются автоматически.
                </p>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setShowBulk(s => !s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${showBulk ? BLUE : '#E3E7F0'}`,
                      background: showBulk ? '#EBF1FE' : '#fff', color: showBulk ? BLUE : '#374151',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Вставить списком
                  </button>
                  <button
                    onClick={addEmployee}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${BLUE}`,
                      background: '#EBF1FE', color: BLUE, fontSize: 12.5, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    <IcPlus size={13} color={BLUE} />
                    Добавить
                  </button>
                </div>
              </div>

              {/* Bulk paste — one person per line; optional "ФИО | Должность" */}
              {showBulk && (
                <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: '#F8FAFD', border: '1px solid #E3E7F0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                    По одному человеку в строке. Можно сразу с должностью: <code style={{ background: '#EBF1FE', padding: '1px 5px', borderRadius: 4 }}>ФИО | Должность</code> (разделитель <b>|</b>, <b>;</b>, <b>,</b> или таб). Удобно вставить из Excel/Word.
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={'Иванов Иван Иванович | Инженер\nПетров Пётр Петрович, Технолог\nСидоров Сидор Сидорович'}
                    rows={6}
                    style={{ ...inputStyle, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setBulkText(''); setShowBulk(false); }}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E3E7F0', background: '#fff', color: '#374151', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                      Отмена
                    </button>
                    <button onClick={applyBulk} disabled={!bulkText.trim()}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: bulkText.trim() ? NAVY : '#E5E7EB', color: bulkText.trim() ? '#fff' : '#9CA3AF',
                        fontSize: 12.5, fontWeight: 600, cursor: bulkText.trim() ? 'pointer' : 'not-allowed',
                      }}>
                      Добавить {bulkText.split('\n').map(l => l.trim()).filter(Boolean).length || ''} строк
                    </button>
                  </div>
                </div>
              )}

              {errors.employees && <p style={{ color: '#DC2626', fontSize: 12, margin: '0 0 10px' }}>{errors.employees}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {employees.map((emp, idx) => (
                  <EmployeeRowItem
                    key={emp.id}
                    emp={emp}
                    index={idx}
                    hasError={!!errors[`emp_${emp.id}`]}
                    canRemove={employees.length > 1}
                    onUpdate={updateEmployee}
                    onRemove={removeEmployee}
                  />
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
                    /* Global course selection — selected rise to top, drag to reorder */
                    <div>
                      <CourseAssignPicker
                        courses={publishedCourses}
                        value={globalCourses}
                        onChange={setGlobalCourses}
                      />
                      {globalCourses.length > 0 && (
                        <div style={{ fontSize: 12, color: BLUE, marginTop: 6 }}>
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
                          <CourseAssignPicker
                            compact
                            courses={publishedCourses}
                            value={emp.courses}
                            onChange={ids => setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, courses: ids } : e))}
                          />
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

              {/* Preview table — scrolls horizontally on narrow screens */}
              <div style={{ borderRadius: 10, border: '1px solid #E3E7F0', overflow: 'auto' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '36px minmax(160px, 1fr) minmax(140px, 1fr) 90px 70px',
                  padding: '10px 14px', background: NAVY, gap: 10,
                  fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase',
                  minWidth: 520,
                }}>
                  <div>№</div><div>ФИО</div><div>Должность</div><div>Логин</div><div>Пароль</div>
                </div>
                {employees.map((emp, i) => (
                  <div key={emp.id} style={{
                    display: 'grid', gridTemplateColumns: '36px minmax(160px, 1fr) minmax(140px, 1fr) 90px 70px',
                    padding: '9px 14px', gap: 10, fontSize: 12.5, color: '#374151',
                    borderBottom: i < employees.length - 1 ? '1px solid #F3F4F6' : 'none',
                    minWidth: 520,
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

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleExport}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 10, border: `1.5px solid ${NAVY}`,
                    background: '#fff', color: NAVY, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <IcDownload size={17} color={NAVY} />
                  Word
                </button>
                <button
                  onClick={handleExportPdf}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 10, border: 'none',
                    background: NAVY, color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,61,132,0.3)',
                  }}
                >
                  <IcDownload size={17} color="#fff" />
                  PDF
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '10px 0 0' }}>
                Файл с ФИО, логинами и паролями (PDF — со ссылкой для входа, удобно с телефона)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F3F4F6',
          display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap',
        }}>
          {/* Left: draft save (data is also auto-saved continuously) */}
          {created ? <span /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={saveDraftNow} disabled={!hasContent}
                title="Черновик также сохраняется автоматически"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 9, border: '1.5px solid #E3E7F0',
                  background: '#fff', color: hasContent ? NAVY : '#9CA3AF',
                  fontSize: 12.5, fontWeight: 600, cursor: hasContent ? 'pointer' : 'not-allowed',
                }}>
                💾 Сохранить черновик
              </button>
              {draftSavedNote
                ? <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>Сохранено ✓</span>
                : <span style={{ fontSize: 11, color: '#9CA3AF' }}>сохраняется автоматически</span>}
            </div>
          )}

          {/* Right: navigation */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
              <button onClick={closeModal}
                title="Введённые данные сохранятся в черновике"
                style={{
                  padding: '9px 20px', borderRadius: 9, border: '1.5px solid #E3E7F0',
                  background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                }}>
                Закрыть
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReportModal (updated with request number filter)
// ═══════════════════════════════════════════════════════════════════════════════
type ReportType = 'zayavka' | 'logins' | 'statistika';

const REPORT_TYPES: { value: ReportType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: 'zayavka',    label: 'Заявка',           desc: 'По каждому назначенному курсу: ФИО · Должность · Дата прохождения', icon: IcDocument },
  { value: 'logins',     label: 'Логины и пароли',  desc: 'ФИО · Должность · Логин · Пароль · Назначенные курсы',              icon: IcBook },
  { value: 'statistika', label: 'Статистика',        desc: 'Матрица слушатель × назначенный курс с % сдачи',                    icon: IcTeam },
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

  const handleGenerate = async (format: 'word' | 'pdf') => {
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

      if (format === 'pdf') {
        if (type === 'zayavka')    await generateZayavkaPdf(org, users, courses, progressMap, requestNum || undefined);
        if (type === 'logins')     await generateLoginsPasswordsPdf(org, users, courses, requestNum || undefined);
        if (type === 'statistika') await generateStatistikaPdf(org, users, courses, progressMap, requestNum || undefined);
      } else {
        if (type === 'zayavka')    await generateZayavka(org, users, courses, progressMap, requestNum || undefined);
        if (type === 'logins')     await generateLoginsPasswords(org, users, courses, requestNum || undefined);
        if (type === 'statistika') await generateStatistika(org, users, courses, progressMap, requestNum || undefined);
      }

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
            ) : generating ? (
              <button disabled style={{
                padding: '9px 24px', borderRadius: 9, border: 'none', display: 'flex', alignItems: 'center', gap: 7,
                background: '#E5E7EB', color: '#9CA3AF', fontSize: 13.5, fontWeight: 600, cursor: 'not-allowed',
              }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#6B7280', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Формирование…
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleGenerate('word')}
                  disabled={!org}
                  style={{
                    padding: '9px 16px', borderRadius: 9, border: `1.5px solid ${org ? NAVY : '#E5E7EB'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#fff', color: org ? NAVY : '#9CA3AF',
                    fontSize: 13, fontWeight: 600, cursor: org ? 'pointer' : 'not-allowed',
                  }}>
                  <IcDownload size={14} color={org ? NAVY : '#9CA3AF'} /> Word
                </button>
                <button
                  onClick={() => handleGenerate('pdf')}
                  disabled={!org}
                  style={{
                    padding: '9px 18px', borderRadius: 9, border: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: org ? NAVY : '#E5E7EB', color: org ? '#fff' : '#9CA3AF',
                    fontSize: 13, fontWeight: 600, cursor: org ? 'pointer' : 'not-allowed',
                  }}>
                  <IcDownload size={14} color={org ? '#fff' : '#9CA3AF'} /> PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RequestArchiveModal — list & edit prior заявки
// ═══════════════════════════════════════════════════════════════════════════════
interface RequestSummary {
  requestNumber: string;
  organization: string;
  department: string;
  createdAt: string;
  members: ManagedUser[];
}

function summarizeRequests(users: ManagedUser[]): RequestSummary[] {
  const map = new Map<string, RequestSummary>();
  for (const u of users) {
    if (!u.requestNumber) continue;
    const existing = map.get(u.requestNumber);
    if (existing) {
      existing.members.push(u);
    } else {
      map.set(u.requestNumber, {
        requestNumber: u.requestNumber,
        organization: u.organization,
        department: u.department ?? '',
        createdAt: u.createdAt,
        members: [u],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function RequestArchiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, updateUser, deleteUser, addUsersBatch } = useUsers();
  const { courses } = useCourses();
  const publishedCourses = sortCourses(courses.filter(c => c.published));
  const tenantOrg = getCurrentOrganization();

  const requests = useMemo(() => summarizeRequests(users), [users]);

  // Selected request for editing
  const [editingReq, setEditingReq] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Request pending deletion (its member accounts get removed on confirm).
  const [confirmDel, setConfirmDel] = useState<RequestSummary | null>(null);

  // If the open заявка disappears (e.g. all its members deleted), close the editor.
  // Done in an effect, not in render, to avoid "setState during render".
  useEffect(() => {
    if (editingReq && !requests.some(r => r.requestNumber === editingReq)) {
      setEditingReq(null);
    }
  }, [editingReq, requests]);

  const deleteRequest = (req: RequestSummary) => {
    req.members.forEach(m => deleteUser(m.id));
    setConfirmDel(null);
  };

  const q = search.trim().toLowerCase();
  // Members (ФИО / логин) matching the query — used both to surface the заявка
  // and to show WHO matched on its card.
  const memberHits = (r: RequestSummary) =>
    q ? r.members.filter(m => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q)) : [];
  const filtered = requests.filter(r => {
    if (!q) return true;
    return r.requestNumber.toLowerCase().includes(q)
      || r.organization.toLowerCase().includes(q)
      || r.department.toLowerCase().includes(q)
      || memberHits(r).length > 0;
  });

  if (!open) return null;

  // ── Editing view ──
  if (editingReq) {
    const req = requests.find(r => r.requestNumber === editingReq);
    if (!req) return null;   // the cleanup effect above will reset editingReq
    return (
      <RequestEditView
        key={req.requestNumber}
        request={req}
        publishedCourses={publishedCourses}
        existingNumbers={requests.map(r => r.requestNumber).filter(n => n !== req.requestNumber)}
        onClose={() => setEditingReq(null)}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onAddUsers={(batch) => addUsersBatch(batch, req.organization, req.department, req.requestNumber)}
        onRenumber={(newNum) => {
          // Re-stamp every member of this заявка with the new number, then keep the
          // editor open by re-pointing to the new key.
          req.members.forEach(m => updateUser(m.id, { requestNumber: newNum }));
          setEditingReq(newNum);
        }}
      />
    );
  }

  // ── List view ──
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '92%', maxWidth: 880, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcDocument size={20} color={BLUE} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#0F1629' }}>Архив заявок</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>
              {requests.length} {requests.length === 1 ? 'заявка' : requests.length < 5 ? 'заявки' : 'заявок'}
              {tenantOrg ? ` · ${tenantOrg.displayName}` : ' · все организации'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по ФИО, логину, номеру заявки, организации…"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: `1.5px solid ${BORDER}`, background: '#F8FAFD',
              fontSize: 13.5, color: '#0F1629', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED, fontSize: 13.5 }}>
              {requests.length === 0
                ? 'Заявок пока нет. Создайте первую через «По заявке (пакетно)».'
                : 'По запросу ничего не найдено.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(req => (
                <div key={req.requestNumber} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  border: `1.5px solid ${BORDER}`, background: '#fff',
                }}>
                  <div style={{
                    minWidth: 40, height: 40, padding: '0 10px', borderRadius: 9, background: '#F4F6FB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: NAVY, flexShrink: 0,
                  }}>
                    №
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: NAVY, marginBottom: 3, wordBreak: 'break-word', lineHeight: 1.3 }}>
                      №{req.requestNumber}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{req.organization}</span>
                      <span>·</span>
                      <span>{req.department || '— без отдела —'}</span>
                      <span>·</span>
                      <span>{req.createdAt}</span>
                      <span>·</span>
                      <span>{req.members.length} {req.members.length === 1 ? 'сотрудник' : req.members.length < 5 ? 'сотрудника' : 'сотрудников'}</span>
                    </div>
                    {memberHits(req).length > 0 && (
                      <div style={{ fontSize: 11.5, color: BLUE, marginTop: 4, fontWeight: 500 }}>
                        Найден: {memberHits(req).slice(0, 3).map(m => m.name).join(', ')}
                        {memberHits(req).length > 3 ? ` и ещё ${memberHits(req).length - 3}` : ''}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => exportBatchCredentials(
                      req.requestNumber, req.organization,
                      req.members.map(m => ({ name: m.name, login: m.email, password: m.password })),
                      tenantOrg?.slug ?? null,
                    )}
                    style={{
                      padding: '8px 11px', borderRadius: 8, border: `1.5px solid ${BORDER}`,
                      background: '#fff', color: '#374151', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    title="Скачать логины/пароли в Word"
                  >
                    <IcDownload size={13} color="currentColor" /> Word
                  </button>
                  <button
                    onClick={() => exportBatchCredentialsPdf(
                      req.requestNumber, req.organization,
                      req.members.map(m => ({ name: m.name, login: m.email, password: m.password })),
                      tenantOrg?.slug ?? null,
                    )}
                    style={{
                      padding: '8px 11px', borderRadius: 8, border: 'none',
                      background: NAVY, color: '#fff', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    title="Скачать логины/пароли в PDF (со ссылкой)"
                  >
                    <IcDownload size={13} color="#fff" /> PDF
                  </button>
                  <button
                    onClick={() => setEditingReq(req.requestNumber)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: BLUE, color: '#fff', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Открыть
                  </button>
                  <button
                    onClick={() => setConfirmDel(req)}
                    title="Удалить заявку"
                    style={{
                      padding: 8, borderRadius: 8, border: `1.5px solid #FECACA`,
                      background: '#fff', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IcTrash size={14} color="#DC2626" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Delete-request confirmation */}
          {confirmDel && (
            <div onClick={() => setConfirmDel(null)} style={{
              position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.55)', zIndex: 1100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 22,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <IcWarning size={22} color="#DC2626" />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0F1629' }}>
                  Удалить заявку №{confirmDel.requestNumber}?
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
                  Будут удалены <strong>{confirmDel.members.length}</strong> {confirmDel.members.length === 1 ? 'учётная запись' : confirmDel.members.length < 5 ? 'учётные записи' : 'учётных записей'} этой заявки
                  ({confirmDel.organization}). Действие необратимо. Перед удалением убедитесь, что данные больше не актуальны.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setConfirmDel(null)} style={{
                    padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${BORDER}`,
                    background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>Отмена</button>
                  <button onClick={() => deleteRequest(confirmDel)} style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Удалить заявку</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RequestEditView — edit employees of one заявка
// ═══════════════════════════════════════════════════════════════════════════════
function RequestEditView({
  request, publishedCourses, existingNumbers, onClose, onUpdateUser, onDeleteUser, onAddUsers, onRenumber,
}: {
  request: RequestSummary;
  publishedCourses: { id: string; title: string }[];
  existingNumbers: string[];
  onClose: () => void;
  onUpdateUser: (id: string, updates: Partial<ManagedUser>) => void;
  onDeleteUser: (id: string) => void;
  onAddUsers: (batch: BatchUserInput[]) => ManagedUser[];
  onRenumber: (newNum: string) => void;
}) {
  // Working copy of members (so we batch updates on save)
  const [members, setMembers] = useState(request.members.map(m => ({ ...m })));
  const [newRows, setNewRows] = useState<EmployeeRow[]>([]);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [sortMode, setSortMode] = useState<'name' | 'recent'>('name');

  // Inline edit of the заявка number
  const [editNum, setEditNum] = useState(false);
  const [numDraft, setNumDraft] = useState(request.requestNumber);
  const [numErr, setNumErr] = useState('');
  const commitNumber = () => {
    const v = numDraft.trim();
    if (!v) { setNumErr('Введите номер'); return; }
    if (v === request.requestNumber) { setEditNum(false); setNumErr(''); return; }
    if (existingNumbers.includes(v)) { setNumErr('Такой номер уже есть'); return; }
    onRenumber(v);
    setEditNum(false);
    setNumErr('');
  };

  const updMember = (id: string, field: keyof ManagedUser, value: any) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleCourse = (id: string, courseId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      const has = m.enrolledCourses.includes(courseId);
      return { ...m, enrolledCourses: has ? m.enrolledCourses.filter(c => c !== courseId) : [...m.enrolledCourses, courseId] };
    }));
  };

  const toggleDelete = (id: string) => {
    setToDelete(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addNewRow = () => {
    setNewRows(prev => [...prev, {
      id: mkEmpId(), name: '', position: '',
      login: genLogin6(), password: genPassword4(), courses: [],
    }]);
  };

  const updNewRow = (id: string, field: keyof EmployeeRow, value: any) => {
    setNewRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeNewRow = (id: string) => {
    setNewRows(prev => prev.filter(r => r.id !== id));
  };

  const toggleNewRowCourse = (id: string, courseId: string) => {
    setNewRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const has = r.courses.includes(courseId);
      return { ...r, courses: has ? r.courses.filter(c => c !== courseId) : [...r.courses, courseId] };
    }));
  };

  const handleSave = () => {
    // Apply edits — but skip rows that are already marked for deletion (no point updating then deleting)
    members.forEach(m => {
      if (toDelete.has(m.id)) return;
      const orig = request.members.find(o => o.id === m.id);
      if (!orig) return;
      const changed: Partial<ManagedUser> = {};
      if (m.name !== orig.name) changed.name = m.name;
      if (m.position !== orig.position) changed.position = m.position;
      if (m.email !== orig.email) changed.email = m.email;
      if (m.password !== orig.password) changed.password = m.password;
      const sameCourses = m.enrolledCourses.length === orig.enrolledCourses.length
        && [...m.enrolledCourses].sort().join('|') === [...orig.enrolledCourses].sort().join('|');
      if (!sameCourses) changed.enrolledCourses = m.enrolledCourses;
      if (Object.keys(changed).length > 0) onUpdateUser(m.id, changed);
    });
    // Delete marked
    toDelete.forEach(id => onDeleteUser(id));
    // Add new rows
    const filteredNew = newRows.filter(r => r.name.trim());
    if (filteredNew.length > 0) {
      onAddUsers(filteredNew.map(r => ({
        name: r.name, position: r.position, login: r.login, password: r.password,
        enrolledCourses: r.courses,
      })));
    }
    setSaved(true);
    setTimeout(onClose, 900);
  };

  const editInp: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, border: `1.5px solid ${BORDER}`,
    background: '#fff', fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
  };

  // Members to render: filtered by the ФИО/логин search, then sorted by the
  // chosen mode. handleSave still operates on `members`, so display order is safe.
  const displayMembers = (() => {
    const mq = memberSearch.trim().toLowerCase();
    const list = mq
      ? members.filter(m => m.name.toLowerCase().includes(mq) || (m.email ?? '').toLowerCase().includes(mq))
      : members.slice();
    if (sortMode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else {
      // 'recent' — most recently added first (newer createdAt, then later in the list).
      list.sort((a, b) => {
        const d = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        return d !== 0 ? d : members.indexOf(b) - members.indexOf(a);
      });
    }
    return list;
  })();

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.5)', zIndex: 1001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '94%', maxWidth: 1100, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{
            padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`,
            background: '#fff', cursor: 'pointer', fontSize: 12, color: MUTED,
          }}>← Назад</button>
          <div style={{ flex: 1 }}>
            {editNum ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, color: '#0F1629', fontWeight: 600 }}>Заявка №</span>
                <input
                  autoFocus
                  value={numDraft}
                  onChange={e => { setNumDraft(e.target.value); setNumErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') commitNumber(); if (e.key === 'Escape') { setEditNum(false); setNumDraft(request.requestNumber); setNumErr(''); } }}
                  style={{
                    width: 110, padding: '5px 9px', borderRadius: 7, fontSize: 14, fontWeight: 600,
                    border: `1.5px solid ${numErr ? '#DC2626' : BLUE}`, outline: 'none',
                  }}
                />
                <button onClick={commitNumber} style={{
                  padding: '5px 12px', borderRadius: 7, border: 'none', background: '#059669',
                  color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>Сохранить</button>
                <button onClick={() => { setEditNum(false); setNumDraft(request.requestNumber); setNumErr(''); }} style={{
                  padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${BORDER}`, background: '#fff',
                  color: '#374151', fontSize: 12.5, cursor: 'pointer',
                }}>Отмена</button>
                {numErr && <span style={{ fontSize: 11.5, color: '#DC2626', width: '100%' }}>{numErr}</span>}
              </div>
            ) : (
              <h2 style={{ margin: 0, fontSize: 16, color: '#0F1629', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ wordBreak: 'break-word' }}>Заявка №{request.requestNumber}</span>
                <button
                  onClick={() => { setNumDraft(request.requestNumber); setEditNum(true); setNumErr(''); }}
                  title="Изменить номер заявки"
                  style={{
                    padding: '3px 10px', borderRadius: 6, border: `1.5px solid ${BORDER}`,
                    background: '#fff', color: BLUE, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Изменить №
                </button>
              </h2>
            )}
            <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>
              {request.organization} · {request.department || '— без отдела —'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 20px' }}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <IcCheckCircle size={28} color="#059669" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#059669', margin: 0 }}>
                Изменения сохранены
              </p>
            </div>
          ) : (
            <>
              {/* Existing members */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  Сотрудники в заявке ({members.length - toDelete.size})
                </div>
                {members.length > 6 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Поиск сотрудника по ФИО или логину…"
                      style={{
                        flex: '1 1 200px', padding: '8px 11px', borderRadius: 8,
                        border: `1.5px solid ${BORDER}`, background: '#F8FAFD',
                        fontSize: 13, color: '#0F1629', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      {([['name', 'А→Я'], ['recent', 'Последние']] as const).map(([mode, label], i) => (
                        <button key={mode} type="button" onClick={() => setSortMode(mode)}
                          title={mode === 'name' ? 'По алфавиту' : 'Последние добавленные'}
                          style={{
                            padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: 12.5,
                            borderLeft: i ? `1.5px solid ${BORDER}` : 'none',
                            fontWeight: sortMode === mode ? 700 : 500,
                            background: sortMode === mode ? '#EBF1FE' : '#fff',
                            color: sortMode === mode ? BLUE : '#6B7280',
                          }}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}
                {displayMembers.map((m, idx) => {
                  const willDelete = toDelete.has(m.id);
                  return (
                    <div key={m.id} style={{
                      padding: 12, borderRadius: 10, border: `1.5px solid ${willDelete ? '#FECACA' : BORDER}`,
                      background: willDelete ? '#FEF2F2' : '#FAFBFE', marginBottom: 8,
                      opacity: willDelete ? 0.5 : 1, transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(160px, 2fr) minmax(120px, 1.5fr) minmax(80px, 1fr) minmax(80px, 1fr) 36px', gap: 8, alignItems: 'center', marginBottom: 8, minWidth: 580, overflowX: 'auto' as const }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, textAlign: 'center' }}>{idx + 1}</span>
                        <input
                          value={m.name} onChange={e => updMember(m.id, 'name', e.target.value)}
                          placeholder="ФИО" style={editInp} disabled={willDelete}
                        />
                        <input
                          value={m.position ?? ''} onChange={e => updMember(m.id, 'position', e.target.value)}
                          placeholder="Должность" style={editInp} disabled={willDelete}
                        />
                        <input
                          value={m.email} onChange={e => updMember(m.id, 'email', e.target.value)}
                          placeholder="Логин" style={editInp} disabled={willDelete}
                        />
                        <input
                          value={m.password} onChange={e => updMember(m.id, 'password', e.target.value)}
                          placeholder="Пароль" style={editInp} disabled={willDelete}
                        />
                        <button
                          onClick={() => toggleDelete(m.id)}
                          title={willDelete ? 'Отменить удаление' : 'Удалить'}
                          style={{
                            padding: 6, borderRadius: 6, border: 'none',
                            background: willDelete ? '#FEE2E2' : 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <IcTrash size={14} color={willDelete ? '#DC2626' : '#9CA3AF'} />
                        </button>
                      </div>
                      {/* Course chips */}
                      {publishedCourses.length > 0 && !willDelete && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 32 }}>
                          {publishedCourses.map(c => {
                            const on = m.enrolledCourses.includes(c.id);
                            return (
                              <button key={c.id} onClick={() => toggleCourse(m.id, c.id)} style={{
                                padding: '4px 10px', borderRadius: 999, border: `1.5px solid ${on ? BLUE : BORDER}`,
                                background: on ? '#EBF1FE' : '#fff', color: on ? BLUE : '#6B7280',
                                fontSize: 11.5, fontWeight: on ? 600 : 500, cursor: 'pointer',
                              }}>
                                {on ? '✓ ' : ''}{c.title}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {memberSearch.trim() && displayMembers.length === 0 && (
                  <div style={{ fontSize: 12.5, color: '#9CA3AF', padding: '6px 2px' }}>Никого не найдено по «{memberSearch}».</div>
                )}
              </div>

              {/* New rows */}
              {newRows.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Новые сотрудники ({newRows.length})
                  </div>
                  {newRows.map((r, idx) => (
                    <div key={r.id} style={{
                      padding: 12, borderRadius: 10, border: `1.5px solid #BBF7D0`,
                      background: '#F0FDF4', marginBottom: 8,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(160px, 2fr) minmax(120px, 1.5fr) minmax(80px, 1fr) minmax(80px, 1fr) 36px', gap: 8, alignItems: 'center', marginBottom: 8, minWidth: 580, overflowX: 'auto' as const }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', textAlign: 'center' }}>+{idx + 1}</span>
                        <input value={r.name} onChange={e => updNewRow(r.id, 'name', e.target.value)} placeholder="ФИО" style={editInp} />
                        <input value={r.position} onChange={e => updNewRow(r.id, 'position', e.target.value)} placeholder="Должность" style={editInp} />
                        <input value={r.login} onChange={e => updNewRow(r.id, 'login', e.target.value)} placeholder="Логин" style={editInp} />
                        <input value={r.password} onChange={e => updNewRow(r.id, 'password', e.target.value)} placeholder="Пароль" style={editInp} />
                        <button onClick={() => removeNewRow(r.id)} style={{
                          padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer',
                        }}>
                          <IcTrash size={14} color="#9CA3AF" />
                        </button>
                      </div>
                      {publishedCourses.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 32 }}>
                          {publishedCourses.map(c => {
                            const on = r.courses.includes(c.id);
                            return (
                              <button key={c.id} onClick={() => toggleNewRowCourse(r.id, c.id)} style={{
                                padding: '4px 10px', borderRadius: 999, border: `1.5px solid ${on ? '#059669' : BORDER}`,
                                background: on ? '#D1FAE5' : '#fff', color: on ? '#047857' : '#6B7280',
                                fontSize: 11.5, fontWeight: on ? 600 : 500, cursor: 'pointer',
                              }}>
                                {on ? '✓ ' : ''}{c.title}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={addNewRow} style={{
                width: '100%', padding: 10, borderRadius: 8,
                border: `1.5px dashed #BFDBFE`, background: '#F4F8FF',
                color: BLUE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <IcPlus size={14} color={BLUE} /> Добавить сотрудника в эту заявку
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
            }}>
              Отмена
            </button>
            <button onClick={handleSave} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: '#059669', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IcCheck size={14} color="#fff" /> Сохранить изменения
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrganizationsModal — manage tenant organizations (subdomains)
// ═══════════════════════════════════════════════════════════════════════════════
const SLUG_RX = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

function OrganizationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organizations, createOrganization, updateOrganization, deleteOrganization, uploadLogo } = useOrganizationsContext();
  const { allUsers } = useUsers();

  const [mode, setMode] = useState<'list' | 'create' | { edit: string }>('list');
  const [form, setForm] = useState<{ slug: string; displayName: string; fullName: string; logoUrl: string }>({
    slug: '', displayName: '', fullName: '', logoUrl: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  // confirmDelete is { slug, userCount } — userCount > 0 means we require an extra confirm.
  const [confirmDelete, setConfirmDelete] = useState<{ slug: string; userCount: number } | null>(null);

  // Count users per organization. Match the same logic the server uses.
  const userCountBySlug = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of organizations) {
      const names = new Set([
        o.fullName, o.displayName, ...(o.legacyAliases ?? []),
      ].map(s => s?.toLowerCase().trim()).filter(Boolean) as string[]);
      counts[o.slug] = allUsers.filter(u =>
        u.organization && names.has(u.organization.toLowerCase().trim())
      ).length;
    }
    return counts;
  }, [organizations, allUsers]);

  useEffect(() => {
    if (!open) {
      setMode('list');
      setForm({ slug: '', displayName: '', fullName: '', logoUrl: '' });
      setError('');
      setConfirmDelete(null);
    }
  }, [open]);

  // When entering edit/create mode, prefill the form.
  useEffect(() => {
    if (typeof mode === 'object' && 'edit' in mode) {
      const o = organizations.find(x => x.slug === mode.edit);
      if (o) setForm({ slug: o.slug, displayName: o.displayName, fullName: o.fullName, logoUrl: o.logoUrl ?? '' });
    } else if (mode === 'create') {
      setForm({ slug: '', displayName: '', fullName: '', logoUrl: '' });
    }
    setError('');
  }, [mode]);

  if (!open) return null;

  const handleSave = async () => {
    setError('');
    const slug = form.slug.trim().toLowerCase();
    const displayName = form.displayName.trim();
    const fullName = form.fullName.trim();

    if (mode === 'create') {
      if (!SLUG_RX.test(slug)) {
        setError('Поддомен должен содержать только латиницу нижнего регистра, цифры и дефисы (1–30 символов).');
        return;
      }
      if (slug === 'www' || slug === 'kazskills') {
        setError('Этот поддомен зарезервирован.');
        return;
      }
      if (organizations.some(o => o.slug === slug)) {
        setError('Поддомен уже занят.');
        return;
      }
    }
    if (!displayName) { setError('Введите короткое название.'); return; }
    if (!fullName)    { setError('Введите полное название.'); return; }

    setBusy(true);
    try {
      if (mode === 'create') {
        await createOrganization({ slug, displayName, fullName, logoUrl: form.logoUrl || undefined });
      } else if (typeof mode === 'object') {
        await updateOrganization(mode.edit, {
          displayName,
          fullName,
          // pass explicit null to clear if the user removed the logo
          logoUrl: form.logoUrl ? form.logoUrl : null,
        });
      }
      setMode('list');
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось сохранить.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogoPick = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Файл больше 2 МБ. Уменьшите размер.');
      return;
    }
    if (!/^image\//.test(file.type)) {
      setError('Нужен файл-изображение (PNG, JPG, SVG).');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      setForm(f => ({ ...f, logoUrl: url }));
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось загрузить логотип.');
    } finally {
      setUploading(false);
    }
  };

  const requestDelete = (slug: string) => {
    setConfirmDelete({ slug, userCount: userCountBySlug[slug] ?? 0 });
  };

  const handleDelete = async (force = false) => {
    if (!confirmDelete) return;
    setBusy(true);
    setError('');
    try {
      const r = await deleteOrganization(confirmDelete.slug, { force });
      if (r.deleted) {
        setConfirmDelete(null);
      } else {
        // Server reported members; surface the precise count for the confirm step.
        setConfirmDelete({ slug: confirmDelete.slug, userCount: r.userCount ?? 0 });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось удалить.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '92%', maxWidth: 720, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcBuilding size={20} color={BLUE} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#0F1629' }}>
              {mode === 'list' && 'Организации'}
              {mode === 'create' && 'Новая организация'}
              {typeof mode === 'object' && 'Редактировать организацию'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>
              {mode === 'list'
                ? `Каждая получает свой поддомен вида slug.kazskills.kz`
                : 'У каждой свой поддомен и изолированная админка'}
            </p>
          </div>
          {mode !== 'list' && (
            <button onClick={() => setMode('list')} style={{
              padding: '6px 12px', borderRadius: 7, border: `1px solid ${BORDER}`,
              background: '#fff', cursor: 'pointer', fontSize: 12, color: MUTED,
            }}>← Назад</button>
          )}
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcClose size={15} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 20px' }}>
          {mode === 'list' && (
            <>
              {organizations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED, fontSize: 13.5 }}>
                  Организаций пока нет.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {organizations.map(o => {
                    const count = userCountBySlug[o.slug] ?? 0;
                    return (
                      <div key={o.slug} style={{
                        padding: '12px 14px', borderRadius: 10,
                        border: `1.5px solid ${BORDER}`, background: '#FAFBFE',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Logo / initials */}
                          {o.logoUrl ? (
                            <img
                              src={o.logoUrl} alt={o.displayName}
                              style={{
                                width: 42, height: 42, borderRadius: 9,
                                objectFit: 'contain', background: '#fff',
                                border: `1px solid ${BORDER}`,
                              }}
                            />
                          ) : (
                            <div style={{
                              width: 42, height: 42, borderRadius: 9, background: '#EBF1FE',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, color: NAVY,
                            }}>
                              {o.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F1629' }}>
                                {o.displayName}
                              </span>
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                padding: '2px 7px', borderRadius: 999,
                                background: count > 0 ? '#EBF1FE' : '#F4F6FB',
                                color: count > 0 ? BLUE : MUTED,
                                whiteSpace: 'nowrap',
                              }}>
                                {count} {count === 1 ? 'юзер' : count > 1 && count < 5 ? 'юзера' : 'юзеров'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                              {o.fullName}
                            </div>
                            <a
                              href={`https://${o.slug}.kazskills.kz`}
                              target="_blank" rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 11.5, color: BLUE, marginTop: 4, textDecoration: 'none',
                                fontWeight: 500,
                              }}
                            >
                              {o.slug}.kazskills.kz ↗
                            </a>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setMode({ edit: o.slug })} style={{
                              padding: '7px 12px', borderRadius: 7, border: `1px solid ${BORDER}`,
                              background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151',
                            }}>Изменить</button>
                            <button
                              onClick={() => requestDelete(o.slug)}
                              title="Удалить"
                              style={{
                                padding: 8, borderRadius: 7, border: `1px solid ${BORDER}`,
                                background: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <IcTrash size={13} color="#9CA3AF" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setMode('create')}
                style={{
                  width: '100%', padding: 12, borderRadius: 9,
                  border: `1.5px dashed #BFDBFE`, background: '#F4F8FF',
                  color: BLUE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <IcPlus size={14} color={BLUE} /> Добавить организацию
              </button>

              {/* Delete confirm dialog */}
              {confirmDelete && (() => {
                const target = organizations.find(x => x.slug === confirmDelete.slug);
                const hasMembers = confirmDelete.userCount > 0;
                return (
                  <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,22,41,0.55)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} onClick={() => setConfirmDelete(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                      background: '#fff', borderRadius: 14, width: '90%', maxWidth: 460,
                      padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: hasMembers ? '#FEF3C7' : '#FEE2E2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 12,
                      }}>
                        <IcWarning size={22} color={hasMembers ? '#B45309' : '#DC2626'} />
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0F1629' }}>
                        Удалить «{target?.displayName ?? confirmDelete.slug}»?
                      </h3>
                      {hasMembers ? (
                        <>
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
                            В этой организации <strong>{confirmDelete.userCount}</strong> {confirmDelete.userCount === 1 ? 'учётная запись' : confirmDelete.userCount < 5 ? 'учётные записи' : 'учётных записей'}.
                            Если удалить, эти юзеры останутся в системе, но перестанут попадать на свой поддомен (логин будет отвергнут).
                          </p>
                          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#92400E', background: '#FEF3C7', padding: '10px 12px', borderRadius: 8, border: '1px solid #FDE68A' }}>
                            Рекомендация: сначала перенесите юзеров в другую организацию или удалите их.
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
                          В организации нет пользователей. Удалить безопасно — поддомен освободится.
                        </p>
                      )}
                      {error && (
                        <div style={{
                          padding: '8px 12px', borderRadius: 7, marginBottom: 10,
                          background: '#FEF2F2', border: '1px solid #FECACA',
                          color: '#991B1B', fontSize: 12,
                        }}>{error}</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => { setConfirmDelete(null); setError(''); }}
                          disabled={busy}
                          style={{
                            padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${BORDER}`,
                            background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          }}>
                          Отмена
                        </button>
                        <button
                          onClick={() => handleDelete(hasMembers)}
                          disabled={busy}
                          style={{
                            padding: '9px 18px', borderRadius: 8, border: 'none',
                            background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600,
                            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                          }}>
                          {hasMembers ? `Всё равно удалить (${confirmDelete.userCount})` : 'Удалить'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {(mode === 'create' || typeof mode === 'object') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Поддомен <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {mode === 'create' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        value={form.slug}
                        onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                        placeholder="astana"
                        style={{
                          flex: '0 0 200px', padding: '9px 12px', borderRadius: 8,
                          border: `1.5px solid ${BORDER}`, background: '#fff',
                          fontSize: 13.5, outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 13, color: MUTED }}>.kazskills.kz</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9CA3AF' }}>
                      Только латиница, цифры и дефисы. 1–30 символов. После создания изменить нельзя.
                    </p>
                  </>
                ) : (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, background: '#F4F6FB',
                    border: `1.5px solid ${BORDER}`, fontSize: 13, color: '#374151',
                  }}>
                    {form.slug}.kazskills.kz
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Короткое название <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Astana"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: `1.5px solid ${BORDER}`, background: '#fff',
                    fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9CA3AF' }}>
                  Отображается в бейдже на странице входа и в шапке.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Полное название <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="АО «Astana»"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: `1.5px solid ${BORDER}`, background: '#fff',
                    fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9CA3AF' }}>
                  Используется в карточке клиента, в Word-отчётах и при создании юзеров.
                </p>
              </div>

              {/* Logo upload */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Логотип
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 9,
                  border: `1.5px solid ${BORDER}`, background: '#FAFBFE',
                }}>
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo preview" style={{
                      width: 56, height: 56, borderRadius: 8, objectFit: 'contain',
                      background: '#fff', border: `1px solid ${BORDER}`,
                    }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 8, background: '#EBF1FE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#9CA3AF', fontSize: 11, textAlign: 'center', lineHeight: 1.3,
                    }}>
                      Нет лого
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 7, border: `1.5px solid ${BORDER}`,
                      background: '#fff', cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 500, color: '#374151',
                      opacity: uploading ? 0.6 : 1,
                    }}>
                      {uploading ? 'Загрузка…' : (form.logoUrl ? 'Заменить' : 'Загрузить PNG/JPG/SVG')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={e => { handleLogoPick(e.target.files?.[0]); e.currentTarget.value = ''; }}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}
                        style={{
                          marginLeft: 6,
                          padding: '7px 10px', borderRadius: 7, border: 'none',
                          background: 'transparent', color: '#DC2626', cursor: 'pointer',
                          fontSize: 12, fontWeight: 500,
                        }}
                      >
                        Убрать
                      </button>
                    )}
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9CA3AF' }}>
                      Отображается вместо «KAZSKILLS» в шапке на поддомене этой организации. Макс. 2 МБ.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  color: '#991B1B', fontSize: 12.5,
                }}>
                  {error}
                </div>
              )}

              {mode === 'create' && (
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: '#F0FDF4', border: '1px solid #BBF7D0',
                  fontSize: 12, color: '#065F46',
                }}>
                  <strong>После создания</strong> поддомен будет доступен по адресу:<br/>
                  <span style={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                    https://{form.slug || 'slug'}.kazskills.kz
                  </span><br/>
                  Wildcard-DNS уже настроен — ничего больше делать не нужно.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(mode === 'create' || typeof mode === 'object') && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setMode('list')} disabled={busy} style={{
              padding: '9px 20px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 500,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            }}>
              Отмена
            </button>
            <button onClick={handleSave} disabled={busy} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: busy ? '#9CA3AF' : '#059669', color: '#fff',
              fontSize: 13.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? 'none' : '0 2px 10px rgba(5,150,105,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IcCheck size={14} color="#fff" /> {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
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
  const tenantOrg = getCurrentOrganization();

  const [reportOpen, setReportOpen] = useState(false);
  const [batchOpen, setBatchOpen]   = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [orgsOpen, setOrgsOpen]     = useState(false);

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

      {/* Main action cards — 4–5 cards depending on role */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
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
            title: 'Архив заявок',
            desc: 'Открыть прошлые заявки, дополнить или удалить сотрудников, посмотреть назначенные курсы и пересохранить .docx.',
            btn: 'Открыть архив',
            btnIcon: IcDocument,
            onClick: () => setArchiveOpen(true),
          },
          {
            icon: IcDownload,
            title: 'Сформировать отчёт',
            desc: 'Три вида отчётов в формате Word: заявка, логины и пароли, статистика по курсам.',
            btn: 'Сформировать отчёт',
            btnIcon: IcDownload,
            onClick: () => setReportOpen(true),
          },
          // Super-admin only (root domain) — managing tenant organizations
          ...(tenantOrg ? [] : [{
            icon: IcBuilding,
            title: 'Организации',
            desc: 'Добавить клиента: указать название и поддомен. Каждая организация получает свой адрес slug.kazskills.kz.',
            btn: 'Управление организациями',
            btnIcon: IcBuilding,
            onClick: () => setOrgsOpen(true),
          }]),
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
      <RequestArchiveModal open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <OrganizationsModal open={orgsOpen} onClose={() => setOrgsOpen(false)} />
    </div>
  );
}
