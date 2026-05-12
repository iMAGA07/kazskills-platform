import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from './AuthContext';
import { userBelongsToCurrentTenant, getOrganizationSlug } from '../lib/organization';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
const STORAGE_KEY = 'kazskills_managed_users';

// Background sync to server; failures are logged but never thrown (UI stays responsive).
async function bgFetch(path: string, init?: RequestInit) {
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
    if (!res.ok) console.warn(`User sync ${path} failed:`, await res.text());
  } catch (e) {
    console.warn(`User sync ${path} error:`, e);
  }
}

export interface ManagedUser extends User {
  password: string;
  createdAt: string;
  status: 'active' | 'blocked';
  requestNumber?: string; // номер заявки, e.g. "001"
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

export interface BatchUserInput {
  name: string;
  position: string;
  login: string;       // 6-digit generated
  password: string;    // 4-digit generated
  enrolledCourses: string[];
}

interface UsersContextType {
  /** Users scoped to the current tenant (filtered by subdomain). */
  users: ManagedUser[];
  /** All users across all tenants — for super-admin use only. */
  allUsers: ManagedUser[];
  addUser: (user: NewUserInput) => void;
  addUsersBatch: (batch: BatchUserInput[], org: string, department: string, requestNumber: string) => ManagedUser[];
  updateUser: (id: string, updates: Partial<ManagedUser>) => void;
  deleteUser: (id: string) => void;
  toggleStatus: (id: string) => void;
}

const UsersContext = createContext<UsersContextType>({
  users: INITIAL_USERS,
  allUsers: INITIAL_USERS,
  addUser: () => {},
  addUsersBatch: () => [],
  updateUser: () => {},
  deleteUser: () => {},
  toggleStatus: () => {},
});

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<ManagedUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Initial sync: fetch from server. If server is empty, seed with our current state
  // (so existing localStorage data isn't lost on first migration).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/users`, { headers: HEADERS });
        if (!res.ok) return;
        const data: ManagedUser[] = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setAllUsers(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } else {
          // Server empty — seed with whatever we currently have (cache or INITIAL_USERS).
          const seed = (() => {
            try {
              const c = localStorage.getItem(STORAGE_KEY);
              return c ? (JSON.parse(c) as ManagedUser[]) : INITIAL_USERS;
            } catch {
              return INITIAL_USERS;
            }
          })();
          bgFetch('/users/replace-all', { method: 'POST', body: JSON.stringify(seed) });
        }
      } catch (e) {
        console.warn('Initial user sync failed, using local cache:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Tenant-scoped view: on root domain shows everything, on subdomain only that org's users.
  const users = useMemo(() => {
    if (!getOrganizationSlug()) return allUsers;
    return allUsers.filter(u => userBelongsToCurrentTenant(u.organization));
  }, [allUsers]);

  const persist = (updated: ManagedUser[]) => {
    setAllUsers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addUser = useCallback((userData: NewUserInput) => {
    const newUser: ManagedUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      enrolledCourses: userData.enrolledCourses ?? [],
      completedCourses: [],
    };
    persist([...allUsers, newUser]);
    bgFetch('/users', { method: 'POST', body: JSON.stringify(newUser) });
  }, [allUsers]);

  const updateUser = useCallback((id: string, updates: Partial<ManagedUser>) => {
    const next = allUsers.map(u => u.id === id ? { ...u, ...updates } : u);
    persist(next);
    const updated = next.find(u => u.id === id);
    if (updated) bgFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
  }, [allUsers]);

  const addUsersBatch = useCallback((
    batch: BatchUserInput[],
    org: string,
    department: string,
    requestNumber: string,
  ): ManagedUser[] => {
    const now = new Date().toISOString().slice(0, 10);
    const newUsers: ManagedUser[] = batch.map((b, i) => ({
      id: `batch-${Date.now()}-${i}`,
      email: b.login,
      password: b.password,
      name: b.name,
      role: 'student' as const,
      organization: org,
      department,
      position: b.position,
      phone: '',
      enrolledCourses: b.enrolledCourses,
      completedCourses: [],
      createdAt: now,
      status: 'active' as const,
      requestNumber,
    }));
    persist([...allUsers, ...newUsers]);
    bgFetch('/users/batch', { method: 'POST', body: JSON.stringify(newUsers) });
    return newUsers;
  }, [allUsers]);

  const deleteUser = useCallback((id: string) => {
    persist(allUsers.filter(u => u.id !== id));
    bgFetch(`/users/${id}`, { method: 'DELETE' });
  }, [allUsers]);

  const toggleStatus = useCallback((id: string) => {
    const next = allUsers.map(u => u.id === id ? { ...u, status: (u.status === 'active' ? 'blocked' : 'active') as 'active' | 'blocked' } : u);
    persist(next);
    const updated = next.find(u => u.id === id);
    if (updated) bgFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: updated.status }) });
  }, [allUsers]);

  return (
    <UsersContext.Provider value={{ users, allUsers, addUser, addUsersBatch, updateUser, deleteUser, toggleStatus }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  return useContext(UsersContext);
}

export { INITIAL_USERS };