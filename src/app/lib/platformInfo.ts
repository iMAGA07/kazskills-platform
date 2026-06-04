// Central place for support contact + the "brief instruction" text so they stay
// consistent across the login page, the student dashboard memo, the floating
// WhatsApp button and the Word credentials export.

// NOTE: the owner gave +77772879547 directly for the button; the client's Word
// doc mentioned +7 (778) 248-60-00. Using the owner's number — change this one
// constant to switch everywhere.
export const SUPPORT_WHATSAPP_NUMBER = '77772879547';
export const SUPPORT_WHATSAPP_DISPLAY = '+7 (777) 287-95-47';

export function whatsappLink(prefilled?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
  return prefilled ? `${base}?text=${encodeURIComponent(prefilled)}` : base;
}

export const SUPPORT_PREFILL =
  'Здравствуйте! У меня вопрос по платформе KAZSKILLS.\n' +
  'ФИО: \nОрганизация и должность: \nОписание проблемы: ';

export interface InstructionStep { title: string; body?: string; }

export const INSTRUCTION_STEPS: InstructionStep[] = [
  {
    title: 'Изучите учебные материалы',
    body: 'Материалы доступны на государственном, русском и английском языках.',
  },
  {
    title: 'Пройдите тестирование',
    body: 'Количество попыток не ограничено.',
  },
  {
    title: 'Видеофиксация экзамена',
    body: 'Для контроля качества экзамена ведётся видеозапись процесса (записи хранятся в течение 6 месяцев).',
  },
  {
    title: 'Фото для сертификата',
    body: 'После достижения проходного балла загрузите имеющееся фото формата «3×4» или сделайте снимок с веб-камеры прямо на платформе — фотография будет добавлена в ваш сертификат.',
  },
];
