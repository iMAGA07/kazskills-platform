export type QuestionType = 'mcq' | 'open_answer' | 'input_field' | 'scale';
export type ContentType = 'video' | 'pdf' | 'pptx';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'not_started' | 'in_progress' | 'completed';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  minScale?: number;
  maxScale?: number;
  scaleLabels?: { min: string; max: string };
}

export interface Lesson {
  id: string;
  title: string;
  type: ContentType;
  url?: string;
  duration?: number;
  order: number;
}

export interface TestConfig {
  questions: Question[];
  timeLimit: number;
  passingScore: number;
  maxAttempts: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  duration: number;
  lessons: Lesson[];
  test: TestConfig;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  thumbnail?: string;
  instructor: string;
  enrolledCount: number;
}

export interface TestAttempt {
  id: string;
  userId: string;
  courseId: string;
  startedAt: string;
  completedAt?: string;
  score: number;
  passed: boolean;
  answers: Record<string, string | number>;
  timeSpent?: number;
}

export interface Progress {
  userId: string;
  courseId: string;
  completedLessons: string[];
  status: CourseStatus;
  startedAt: string;
  completedAt?: string;
  lastAccessedAt: string;
  attempts: TestAttempt[];
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  expiresAt: string;
  number: string;
}

// ============================
// COURSES DATA
// ============================
export const COURSES: Course[] = [
  {
    id: 'course-001',
    title: 'Пожарная безопасность на производственных объектах',
    description: 'Комплексный курс по пожарной безопасности на промышленных объектах РК. Изучите нормы и правила пожарной безопасности, действия при возникновении пожара, методы тушения и профилактические меры согласно требованиям ГОСТ РК и Комитета противопожарной службы.',
    category: 'Пожарная безопасность',
    level: 'beginner',
    duration: 180,
    instructor: 'Сейткали Нурлан Бекович',
    enrolledCount: 124,
    published: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-02-20',
    thumbnail: 'fire',
    lessons: [
      { id: 'l-001-1', title: 'Введение в пожарную безопасность', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 25, order: 1 },
      { id: 'l-001-2', title: 'Нормативная база РК по пожарной безопасности', type: 'pdf', url: '/docs/fire_norms_rk.pdf', duration: 20, order: 2 },
      { id: 'l-001-3', title: 'Классификация пожаров и огнетушащих веществ', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 30, order: 3 },
      { id: 'l-001-4', title: 'Первичные средства пожаротушения', type: 'pptx', url: '/docs/fire_tools.pptx', duration: 15, order: 4 },
      { id: 'l-001-5', title: 'Эвакуация и действия при пожаре', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 25, order: 5 },
    ],
    test: {
      timeLimit: 20,
      passingScore: 70,
      maxAttempts: 3,
      questions: [
        {
          id: 'q-001-1',
          type: 'mcq',
          text: 'Какой класс пожара соответствует горению твёрдых веществ?',
          options: ['Класс A', 'Класс B', 'Класс C', 'Класс D'],
          correctAnswer: 'Класс A',
          points: 10,
        },
        {
          id: 'q-001-2',
          type: 'mcq',
          text: 'Какой огнетушитель запрещён к применению при тушении электроустановок под напряжением?',
          options: ['Углекислотный', 'Порошковый', 'Водный пенный', 'Хладоновый'],
          correctAnswer: 'Водный пенный',
          points: 10,
        },
        {
          id: 'q-001-3',
          type: 'input_field',
          text: 'Укажите минимальное расстояние (в метрах) от пожарного гидранта до стен здания согласно нормам РК.',
          correctAnswer: '5',
          points: 15,
        },
        {
          id: 'q-001-4',
          type: 'open_answer',
          text: 'Опишите порядок действий работника при обнаружении очага возгорания на производственном объекте.',
          points: 20,
        },
        {
          id: 'q-001-5',
          type: 'mcq',
          text: 'Периодичность проведения противопожарных инструктажей на производственных объектах:',
          options: ['Ежемесячно', 'Раз в квартал', 'Раз в полгода', 'Ежегодно'],
          correctAnswer: 'Раз в квартал',
          points: 10,
        },
        {
          id: 'q-001-6',
          type: 'scale',
          text: 'Оцените уровень своей готовности к действиям при пожаре до прохождения курса (1 - не готов, 10 - полностью готов)',
          minScale: 1,
          maxScale: 10,
          scaleLabels: { min: 'Не готов', max: 'Полностью готов' },
          points: 5,
        },
      ],
    },
  },
  {
    id: 'course-002',
    title: 'Охрана труда и безопасность на нефтегазовых объектах',
    description: 'Специализированный курс по охране труда для работников нефтегазовой отрасли. Рассматриваются требования законодательства РК, опасные производственные факторы, правила работы с нефтегазовым оборудованием и методы предотвращения несчастных случаев.',
    category: 'Охрана труда',
    level: 'intermediate',
    duration: 240,
    instructor: 'Сейткали Нурлан Бекович',
    enrolledCount: 89,
    published: true,
    createdAt: '2025-01-20',
    updatedAt: '2025-03-01',
    thumbnail: 'oil',
    lessons: [
      { id: 'l-002-1', title: 'Законодательство РК об охране труда', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 30, order: 1 },
      { id: 'l-002-2', title: 'Опасные производственные факторы на НГО', type: 'pdf', url: '/docs/oil_hazards.pdf', duration: 25, order: 2 },
      { id: 'l-002-3', title: 'Средства индивидуальной защиты (СИЗ)', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 35, order: 3 },
      { id: 'l-002-4', title: 'Работа на высоте и в замкнутых пространствах', type: 'pptx', url: '/docs/height_confined.pptx', duration: 40, order: 4 },
      { id: 'l-002-5', title: 'Первая доврачебная помощь', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 35, order: 5 },
      { id: 'l-002-6', title: 'Расследование и учёт несчастных случаев', type: 'pdf', url: '/docs/accident_investigation.pdf', duration: 25, order: 6 },
    ],
    test: {
      timeLimit: 20,
      passingScore: 75,
      maxAttempts: 3,
      questions: [
        {
          id: 'q-002-1',
          type: 'mcq',
          text: 'Согласно Трудовому кодексу РК, с какой периодичностью работодатель обязан проводить аттестацию производственных объектов?',
          options: ['Ежегодно', 'Раз в 3 года', 'Раз в 5 лет', 'По требованию инспекции'],
          correctAnswer: 'Раз в 5 лет',
          points: 10,
        },
        {
          id: 'q-002-2',
          type: 'mcq',
          text: 'Какой документ является основным при допуске к работам повышенной опасности?',
          options: ['Наряд-допуск', 'Технологическая карта', 'Производственная инструкция', 'Журнал инструктажа'],
          correctAnswer: 'Наряд-допуск',
          points: 10,
        },
        {
          id: 'q-002-3',
          type: 'input_field',
          text: 'Укажите минимальное количество человек в бригаде при работах в замкнутом пространстве.',
          correctAnswer: '3',
          points: 15,
        },
        {
          id: 'q-002-4',
          type: 'open_answer',
          text: 'Перечислите основные элементы системы управления охраной труда (СУОТ) на нефтегазовом предприятии.',
          points: 20,
        },
        {
          id: 'q-002-5',
          type: 'scale',
          text: 'Оцените важность соблюдения правил охраны труда на вашем рабочем месте (1 - не важно, 10 - критически важно)',
          minScale: 1,
          maxScale: 10,
          scaleLabels: { min: 'Не важно', max: 'Критически важно' },
          points: 5,
        },
      ],
    },
  },
  {
    id: 'course-003',
    title: 'Электробезопасность для технического персонала',
    description: 'Курс по электробезопасности для технического персонала промышленных предприятий. Охватывает группы допуска по электробезопасности, правила работы с электроустановками, защитные меры и первую помощь при поражении электрическим током согласно требованиям РК.',
    category: 'Электробезопасность',
    level: 'intermediate',
    duration: 200,
    instructor: 'Сейткали Нурлан Бекович',
    enrolledCount: 67,
    published: true,
    createdAt: '2025-02-01',
    updatedAt: '2025-02-28',
    thumbnail: 'electric',
    lessons: [
      { id: 'l-003-1', title: 'Основы электробезопасности', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 30, order: 1 },
      { id: 'l-003-2', title: 'Группы допуска по электробезопасности', type: 'pdf', url: '/docs/elec_groups.pdf', duration: 25, order: 2 },
      { id: 'l-003-3', title: 'Защитные средства в электроустановках', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 35, order: 3 },
      { id: 'l-003-4', title: 'Организационные меры безопасности', type: 'pptx', url: '/docs/elec_org.pptx', duration: 30, order: 4 },
    ],
    test: {
      timeLimit: 20,
      passingScore: 70,
      maxAttempts: 2,
      questions: [
        {
          id: 'q-003-1',
          type: 'mcq',
          text: 'Какое напряжение считается безопасным для человека в производственных условиях?',
          options: ['До 12 В', 'До 36 В', 'До 42 В', 'До 50 В'],
          correctAnswer: 'До 36 В',
          points: 10,
        },
        {
          id: 'q-003-2',
          type: 'mcq',
          text: 'Что означает III группа допуска по электробезопасности?',
          options: [
            'Право на работу в электроустановках до 1000 В',
            'Право на работу в электроустановках выше 1000 В',
            'Право на единоличный осмотр электроустановок',
            'Право на руководство работами',
          ],
          correctAnswer: 'Право на работу в электроустановках до 1000 В',
          points: 10,
        },
        {
          id: 'q-003-3',
          type: 'open_answer',
          text: 'Опишите порядок наложения заземления при работе в электроустановках.',
          points: 20,
        },
        {
          id: 'q-003-4',
          type: 'scale',
          text: 'Оцените сложность материала данного курса (1 - очень просто, 10 - очень сложно)',
          minScale: 1,
          maxScale: 10,
          scaleLabels: { min: 'Очень просто', max: 'Очень сложно' },
          points: 5,
        },
      ],
    },
  },
  {
    id: 'course-004',
    title: 'Химическая безопасность и работа с опасными веществами',
    description: 'Курс охватывает классификацию опасных химических веществ, правила их хранения и транспортировки, применение СИЗ при работе с химикатами, требования к маркировке и документации согласно нормам РК и международным стандартам GHS.',
    category: 'Химическая безопасность',
    level: 'advanced',
    duration: 300,
    instructor: 'Сейткали Нурлан Бекович',
    enrolledCount: 45,
    published: true,
    createdAt: '2025-02-10',
    updatedAt: '2025-03-05',
    thumbnail: 'chemical',
    lessons: [
      { id: 'l-004-1', title: 'Классификация опасных веществ', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 40, order: 1 },
      { id: 'l-004-2', title: 'Система GHS и маркировка', type: 'pdf', url: '/docs/ghs_labeling.pdf', duration: 30, order: 2 },
      { id: 'l-004-3', title: 'СИЗ при работе с химическими веществами', type: 'pptx', url: '/docs/chem_ppe.pptx', duration: 35, order: 3 },
      { id: 'l-004-4', title: 'Хранение и транспортировка опасных веществ', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 45, order: 4 },
      { id: 'l-004-5', title: 'Аварийные ситуации и ликвидация разливов', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 40, order: 5 },
    ],
    test: {
      timeLimit: 20,
      passingScore: 75,
      maxAttempts: 3,
      questions: [
        {
          id: 'q-004-1',
          type: 'mcq',
          text: 'Какой знак опасности GHS указывает на токсичные вещества?',
          options: ['Череп и кости', 'Восклицательный знак', 'Пламя', 'Коррозия'],
          correctAnswer: 'Череп и кости',
          points: 10,
        },
        {
          id: 'q-004-2',
          type: 'open_answer',
          text: 'Опишите алгоритм действий при разливе химического вещества на производственном объекте.',
          points: 25,
        },
        {
          id: 'q-004-3',
          type: 'scale',
          text: 'Насколько часто вы работаете с химическими веществами на своём рабочем месте? (1 - никогда, 10 - ежедневно)',
          minScale: 1,
          maxScale: 10,
          scaleLabels: { min: 'Никогда', max: 'Ежедневно' },
          points: 5,
        },
      ],
    },
  },
  {
    id: 'course-005',
    title: 'Промышленная безопасность: Основы и нормативная база РК',
    description: 'Базовый курс по промышленной безопасности. Изучите основные понятия, законодательство РК, требования Комитета промышленной безопасности, классификацию опасных производственных объектов и порядок получения разрешительных документов.',
    category: 'Промышленная безопасность',
    level: 'beginner',
    duration: 160,
    instructor: 'Сейткали Нурлан Бекович',
    enrolledCount: 156,
    published: true,
    createdAt: '2025-01-10',
    updatedAt: '2025-02-15',
    thumbnail: 'industrial',
    lessons: [
      { id: 'l-005-1', title: 'Основные понятия промышленной безопасности', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 25, order: 1 },
      { id: 'l-005-2', title: 'Законодательство РК в области ПБ', type: 'pdf', url: '/docs/pb_law_rk.pdf', duration: 20, order: 2 },
      { id: 'l-005-3', title: 'Классификация опасных производственных объектов', type: 'pptx', url: '/docs/opo_classification.pptx', duration: 25, order: 3 },
      { id: 'l-005-4', title: 'Комитет промышленной безопасности РК', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 30, order: 4 },
    ],
    test: {
      timeLimit: 20,
      passingScore: 70,
      maxAttempts: 3,
      questions: [
        {
          id: 'q-005-1',
          type: 'mcq',
          text: 'Какой орган в РК осуществляет государственный надзор в области промышленной безопасности?',
          options: [
            'Комитет промышленной безопасности МЭМР РК',
            'Министерство труда и социальной защиты',
            'Комитет по охране труда',
            'Агентство по чрезвычайным ситуациям',
          ],
          correctAnswer: 'Комитет промышленной безопасности МЭМР РК',
          points: 10,
        },
        {
          id: 'q-005-2',
          type: 'mcq',
          text: 'К какому классу опасности относится производственный объект с наибольшей степенью риска?',
          options: ['I класс', 'II класс', 'III класс', 'IV класс'],
          correctAnswer: 'I класс',
          points: 10,
        },
        {
          id: 'q-005-3',
          type: 'input_field',
          text: 'Укажите срок действия разрешения на применение технических устройств на ОПО (в годах).',
          correctAnswer: '5',
          points: 15,
        },
        {
          id: 'q-005-4',
          type: 'scale',
          text: 'Как бы вы оценили состояние промышленной безопасности на вашем предприятии? (1 - критическое, 10 - отличное)',
          minScale: 1,
          maxScale: 10,
          scaleLabels: { min: 'Критическое', max: 'Отличное' },
          points: 5,
        },
      ],
    },
  },
];

// ============================
// PROGRESS DATA
// ============================
export const PROGRESS_DATA: Progress[] = [
  {
    userId: 'student-001',
    courseId: 'course-001',
    completedLessons: ['l-001-1', 'l-001-2', 'l-001-3', 'l-001-4', 'l-001-5'],
    status: 'completed',
    startedAt: '2025-02-01',
    completedAt: '2025-02-15',
    lastAccessedAt: '2025-02-15',
    attempts: [
      {
        id: 'attempt-001-1',
        userId: 'student-001',
        courseId: 'course-001',
        startedAt: '2025-02-15T10:00:00',
        completedAt: '2025-02-15T10:18:00',
        score: 82,
        passed: true,
        timeSpent: 18,
        answers: {
          'q-001-1': 'Класс A',
          'q-001-2': 'Водный пенный',
          'q-001-3': '5',
          'q-001-4': 'При обнаружении пожара необходимо...',
          'q-001-5': 'Раз в квартал',
          'q-001-6': 7,
        },
      },
    ],
  },
  {
    userId: 'student-001',
    courseId: 'course-002',
    completedLessons: ['l-002-1', 'l-002-2', 'l-002-3'],
    status: 'in_progress',
    startedAt: '2025-02-20',
    lastAccessedAt: '2025-03-08',
    attempts: [],
  },
  {
    userId: 'student-001',
    courseId: 'course-003',
    completedLessons: ['l-003-1'],
    status: 'in_progress',
    startedAt: '2025-03-01',
    lastAccessedAt: '2025-03-09',
    attempts: [],
  },
  {
    userId: 'student-002',
    courseId: 'course-001',
    completedLessons: ['l-001-1', 'l-001-2'],
    status: 'in_progress',
    startedAt: '2025-02-25',
    lastAccessedAt: '2025-03-07',
    attempts: [],
  },
  {
    userId: 'student-002',
    courseId: 'course-002',
    completedLessons: [],
    status: 'not_started',
    startedAt: '2025-03-05',
    lastAccessedAt: '2025-03-05',
    attempts: [],
  },
  {
    userId: 'student-003',
    courseId: 'course-002',
    completedLessons: ['l-002-1', 'l-002-2', 'l-002-3', 'l-002-4', 'l-002-5', 'l-002-6'],
    status: 'completed',
    startedAt: '2025-01-20',
    completedAt: '2025-02-10',
    lastAccessedAt: '2025-02-10',
    attempts: [
      {
        id: 'attempt-002-1',
        userId: 'student-003',
        courseId: 'course-002',
        startedAt: '2025-02-10T14:00:00',
        completedAt: '2025-02-10T14:19:00',
        score: 88,
        passed: true,
        timeSpent: 19,
        answers: {},
      },
    ],
  },
];

// ============================
// CERTIFICATES DATA
// ============================
export const CERTIFICATES: Certificate[] = [
  {
    id: 'cert-001',
    userId: 'student-001',
    courseId: 'course-001',
    issuedAt: '2025-02-15',
    expiresAt: '2026-02-15',
    number: 'KZ-CERT-2025-0142',
  },
  {
    id: 'cert-002',
    userId: 'student-003',
    courseId: 'course-002',
    issuedAt: '2025-02-10',
    expiresAt: '2026-02-10',
    number: 'KZ-CERT-2025-0137',
  },
];

// ============================
// ANALYTICS DATA
// ============================
export const ANALYTICS = {
  monthlyEnrollments: [
    { month: 'Янв', count: 45 },
    { month: 'Фев', count: 78 },
    { month: 'Мар', count: 62 },
    { month: 'Апр', count: 91 },
    { month: 'Май', count: 85 },
    { month: 'Июн', count: 110 },
    { month: 'Июл', count: 98 },
    { month: 'Авг', count: 134 },
    { month: 'Сен', count: 156 },
    { month: 'Окт', count: 142 },
    { month: 'Ноя', count: 167 },
    { month: 'Дек', count: 89 },
  ],
  categoryDistribution: [
    { name: 'Пожарная безопасность', value: 35 },
    { name: 'Охрана труда', value: 28 },
    { name: 'Электробезопасность', value: 18 },
    { name: 'Хим. безопасность', value: 12 },
    { name: 'Пром. безопасность', value: 7 },
  ],
  passRates: [
    { course: 'Пожарная безопасность', rate: 87 },
    { course: 'Охрана труда', rate: 74 },
    { course: 'Электробезопасность', rate: 81 },
    { course: 'Хим. безопасность', rate: 69 },
    { course: 'Пром. безопасность', rate: 92 },
  ],
  weeklyActivity: [
    { day: 'Пн', sessions: 42 },
    { day: 'Вт', sessions: 58 },
    { day: 'Ср', sessions: 71 },
    { day: 'Чт', sessions: 65 },
    { day: 'Пт', sessions: 49 },
    { day: 'Сб', sessions: 18 },
    { day: 'Вс', sessions: 12 },
  ],
};

// Helper functions
export function getProgress(userId: string, courseId: string): Progress | undefined {
  return PROGRESS_DATA.find(p => p.userId === userId && p.courseId === courseId);
}

export function getCertificate(userId: string, courseId: string): Certificate | undefined {
  return CERTIFICATES.find(c => c.userId === userId && c.courseId === courseId);
}

export function getUserCertificates(userId: string): Certificate[] {
  return CERTIFICATES.filter(c => c.userId === userId);
}

// Current user (default student for legacy pages)
export const currentUser = {
  id: 'student-001',
  name: 'Айтмухамбетов Серик Жумакелдинович',
  email: 'serik@kazskills.kz',
  position: 'Инженер по промышленной безопасности',
  company: 'ТОО «Kazskills»',
  department: 'Производственный отдел',
  role: 'student' as const,
};

// Alias for legacy imports
export const mockCourses = COURSES;