import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, UserRole } from './AuthContext';

export interface ManagedUser extends User {
  password: string;
  createdAt: string;
  status: 'active' | 'blocked';
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'admin-001',
    email: 'admin@kazskills.kz',
    password: 'Admin1234',
    name: 'Сейткали Нурлан Бекович',
    role: 'admin',
    organization: 'Kazskills',
    department: 'Отдел обучения и развития',
    position: 'Главный администратор платформы',
    phone: '+7 (727) 300-00-01',
    enrolledCourses: [],
    completedCourses: [],
    createdAt: '2024-01-15',
    status: 'active',
  },
  {
    id: 'student-001',
    email: 'serik@kazskills.kz',
    password: 'Student1234',
    name: 'Айтмухамбетов Серик Жумакелдинович',
    role: 'student',
    organization: 'Kazskills',
    department: 'Производственный отдел',
    position: 'Инженер',
    phone: '+7 (701) 234-56-78',
    enrolledCourses: ['course-001', 'course-002', 'course-003'],
    completedCourses: ['course-001'],
    createdAt: '2024-02-10',
    status: 'active',
  },
  {
    id: 'student-002',
    email: 'alma@kazskills.kz',
    password: 'Student1234',
    name: 'Байжанова Алма Кариповна',
    role: 'student',
    organization: 'Kazskills',
    department: 'Технологический отдел',
    position: 'Технолог',
    phone: '+7 (702) 345-67-89',
    enrolledCourses: ['course-001', 'course-002'],
    completedCourses: [],
    createdAt: '2024-02-15',
    status: 'active',
  },
  {
    id: 'student-003',
    email: 'daniyar@kazskills.kz',
    password: 'Student1234',
    name: 'Жаксыбеков Данияр Серикович',
    role: 'student',
    organization: 'Kazskills',
    department: 'Нефтегазовый отдел',
    position: 'Специалист по ОТ',
    phone: '+7 (705) 456-78-90',
    enrolledCourses: ['course-002', 'course-003', 'course-004'],
    completedCourses: ['course-002'],
    createdAt: '2024-03-01',
    status: 'active',
  },
  {
    id: 'student-004',
    email: 'asem.nurova@kmg.kz',
    password: 'Student1234',
    name: 'Нурова Асем Болатовна',
    role: 'student',
    organization: 'АО «КазМунайГаз»',
    department: 'Отдел охраны труда',
    position: 'Специалист по охране труда',
    phone: '+7 (707) 123-45-67',
    enrolledCourses: ['course-001', 'course-003'],
    completedCourses: ['course-001', 'course-003'],
    createdAt: '2024-03-12',
    status: 'active',
  },
  {
    id: 'student-005',
    email: 'bekzat.aliev@kmg.kz',
    password: 'Student1234',
    name: 'Алиев Бекзат Маратович',
    role: 'student',
    organization: 'АО «КазМунайГаз»',
    department: 'Буровой отдел',
    position: 'Буровой мастер',
    phone: '+7 (708) 234-56-78',
    enrolledCourses: ['course-002', 'course-004'],
    completedCourses: [],
    createdAt: '2024-03-20',
    status: 'active',
  },
  {
    id: 'student-006',
    email: 'zarina@kaztransoil.kz',
    password: 'Student1234',
    name: 'Сапарова Зарина Рустемовна',
    role: 'student',
    organization: 'АО «Казтрансойл»',
    department: 'Технический отдел',
    position: 'Инженер-технолог',
    phone: '+7 (701) 987-65-43',
    enrolledCourses: ['course-001', 'course-002', 'course-003'],
    completedCourses: ['course-002'],
    createdAt: '2024-04-05',
    status: 'active',
  },
  {
    id: 'student-007',
    email: 'murat@kaztransoil.kz',
    password: 'Student1234',
    name: 'Ермекбаев Мурат Ерланович',
    role: 'student',
    organization: 'АО «Казтрансойл»',
    department: 'Отдел эксплуатации',
    position: 'Оператор трубопровода',
    phone: '+7 (702) 876-54-32',
    enrolledCourses: ['course-003'],
    completedCourses: [],
    createdAt: '2024-04-18',
    status: 'blocked',
  },
  {
    id: 'student-008',
    email: 'aizat@tengizchevroil.kz',
    password: 'Student1234',
    name: 'Омарова Айзат Нурлановна',
    role: 'student',
    organization: 'ТОО «Тенгизшевройл»',
    department: 'ОТиПБ',
    position: 'Руководитель по промышленной безопасности',
    phone: '+7 (705) 765-43-21',
    enrolledCourses: ['course-001', 'course-002', 'course-003', 'course-004'],
    completedCourses: ['course-001', 'course-002', 'course-003'],
    createdAt: '2024-05-02',
    status: 'active',
  },
  {
    id: 'student-009',
    email: 'dias@tengizchevroil.kz',
    password: 'Student1234',
    name: 'Касымов Диас Айбекович',
    role: 'student',
    organization: 'ТОО «Тенгизшевройл»',
    department: 'Электротехнический отдел',
    position: 'Электрик',
    phone: '+7 (707) 654-32-10',
    enrolledCourses: ['course-002'],
    completedCourses: [],
    createdAt: '2024-05-15',
    status: 'active',
  },
  {
    id: 'admin-002',
    email: 'admin2@samruk-energy.kz',
    password: 'Admin1234',
    name: 'Жумабеков Руслан Темирович',
    role: 'admin',
    organization: 'АО «Самрук-Энерго»',
    department: 'Отдел подготовки персонала',
    position: 'Администратор обучения',
    phone: '+7 (727) 400-00-02',
    enrolledCourses: [],
    completedCourses: [],
    createdAt: '2024-06-01',
    status: 'active',
  },
  {
    id: 'student-010',
    email: 'gulnara@samruk-energy.kz',
    password: 'Student1234',
    name: 'Каримова Гульнара Саматовна',
    role: 'student',
    organization: 'АО «Самрук-Энерго»',
    department: 'Отдел энергосбережения',
    position: 'Энергоаудитор',
    phone: '+7 (708) 543-21-09',
    enrolledCourses: ['course-001', 'course-004'],
    completedCourses: ['course-004'],
    createdAt: '2024-06-10',
    status: 'active',
  },
  {
    id: 'student-011',
    email: 'kazskills@kazskills.kz',
    password: 'Student1234',
    name: 'Казskills',
    role: 'student',
    organization: 'Kazskills',
    department: 'Отдел обучения и развития',
    position: 'Главный администратор платформы',
    phone: '+7 (708) 543-21-09',
    enrolledCourses: ['course-001', 'course-004'],
    completedCourses: ['course-004'],
    createdAt: '2024-06-10',
    status: 'active',
  },
];

type NewUserInput = Omit<ManagedUser, 'id' | 'createdAt' | 'completedCourses'> & { enrolledCourses?: string[] };

interface UsersContextType {
  users: ManagedUser[];
  addUser: (user: NewUserInput) => void;
  updateUser: (id: string, updates: Partial<ManagedUser>) => void;
  deleteUser: (id: string) => void;
  toggleStatus: (id: string) => void;
}

const UsersContext = createContext<UsersContextType>({
  users: INITIAL_USERS,
  addUser: () => {},
  updateUser: () => {},
  deleteUser: () => {},
  toggleStatus: () => {},
});

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<ManagedUser[]>(() => {
    try {
      const saved = localStorage.getItem('kazskills_managed_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const persist = (updated: ManagedUser[]) => {
    setUsers(updated);
    localStorage.setItem('kazskills_managed_users', JSON.stringify(updated));
  };

  const addUser = useCallback((userData: NewUserInput) => {
    const newUser: ManagedUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      enrolledCourses: userData.enrolledCourses ?? [],
      completedCourses: [],
    };
    persist([...users, newUser]);
  }, [users]);

  const updateUser = useCallback((id: string, updates: Partial<ManagedUser>) => {
    persist(users.map(u => u.id === id ? { ...u, ...updates } : u));
  }, [users]);

  const deleteUser = useCallback((id: string) => {
    persist(users.filter(u => u.id !== id));
  }, [users]);

  const toggleStatus = useCallback((id: string) => {
    persist(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
  }, [users]);

  return (
    <UsersContext.Provider value={{ users, addUser, updateUser, deleteUser, toggleStatus }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  return useContext(UsersContext);
}

export { INITIAL_USERS };