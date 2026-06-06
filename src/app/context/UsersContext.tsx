import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
// authHeaders attaches both the Supabase anon key and our x-session-token (if present).
import type { User, UserRole } from './AuthContext';
import { userBelongsToCurrentTenant, getOrganizationSlug } from '../lib/organization';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from '../components/shared/Toast';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;
const STORAGE_KEY = 'kazskills_managed_users';
const TOKEN_KEY = 'kazskills_token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  // We keep the public anon key for Supabase functions invocation (the platform requires it),
  // and add our own session token for app-level authorization on protected endpoints.
  h.Authorization = `Bearer ${publicAnonKey}`;
  if (token) h['x-session-token'] = token;
  return h;
}

// Post one batch chunk with retries — a transient network failure must not silently
// drop those users (they'd exist only in localStorage and vanish on the next
// server pull). Retries up to 3 times with backoff before surfacing an error.
async function syncBatchChunk(users: ManagedUser[], attempt = 0): Promise<void> {
  try {
    const res = await fetch(`${BASE}/users/batch`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(users),
    });
    if (res.status === 401) { window.dispatchEvent(new Event('session-expired')); return; }
    if (!res.ok) throw new Error(await res.text());
  } catch (e) {
    if (attempt < 2) {
      setTimeout(() => { syncBatchChunk(users, attempt + 1); }, 800 * (attempt + 1));
      return;
    }
    console.warn('Batch chunk failed after retries:', e);
    toast.error('Не все пользователи сохранились на сервере (нет связи). Они сохранены локально — при восстановлении связи откройте заявку и нажмите «Сохранить».');
  }
}

// Background sync to server; failures surface as a single throttled toast (UI stays responsive).
async function bgFetch(path: string, init?: RequestInit) {
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      return;
    }
    if (!res.ok) {
      const body = await res.text();
      console.warn(`User sync ${path} failed:`, body);
      toast.error('Не удалось сохранить изменения на сервере. Локально сохранено — повторите позже.');
    }
  } catch (e) {
    console.warn(`User sync ${path} error:`, e);
    toast.error('Нет связи с сервером. Изменения сохранены локально.');
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

  const syncFromServer = useCallback(async () => {
    // Always try to ensure the server is seeded — it's idempotent (no-op if not empty).
    fetch(`${BASE}/users/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(INITIAL_USERS),
    }).catch(() => {});

    // Then pull the authoritative list. Requires auth token; if absent, we use cache.
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/users`, { headers: authHeaders() });
      if (res.status === 401) {
        window.dispatchEvent(new Event('session-expired'));
        return;
      }
      if (!res.ok) return;
      const data: ManagedUser[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllUsers(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('User sync failed, using local cache:', e);
    }
  }, []);

  // Initial sync + re-sync on login/logout.
  useEffect(() => {
    syncFromServer();
    const onAuthChange = () => syncFromServer();
    window.addEventListener('auth-changed', onAuthChange);
    return () => window.removeEventListener('auth-changed', onAuthChange);
  }, [syncFromServer]);

  // Tenant-scoped view: on root domain shows everything, on subdomain only that org's users.
  const users = useMemo(() => {
    if (!getOrganizationSlug()) return allUsers;
    return allUsers.filter(u => userBelongsToCurrentTenant(u.organization));
  }, [allUsers]);

  // Mutations use the functional setState form so that multiple sequential calls
  // inside the same event handler (e.g. RequestEditView save) all see the latest
  // state, not a stale closure of `allUsers`.
  const persistFn = (recipe: (prev: ManagedUser[]) => ManagedUser[]) => {
    setAllUsers(prev => {
      const next = recipe(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addUser = useCallback((userData: NewUserInput) => {
    const newUser: ManagedUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      enrolledCourses: userData.enrolledCourses ?? [],
      completedCourses: [],
    };
    persistFn(prev => [...prev, newUser]);
    bgFetch('/users', { method: 'POST', body: JSON.stringify(newUser) });
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<ManagedUser>) => {
    let updated: ManagedUser | undefined;
    persistFn(prev => {
      const next = prev.map(u => {
        if (u.id !== id) return u;
        updated = { ...u, ...updates };
        return updated;
      });
      return next;
    });
    if (updated) bgFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
  }, []);

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
    persistFn(prev => [...prev, ...newUsers]);
    // Sync to the server in chunks — a single huge POST (e.g. 400 users) can exceed
    // payload limits or time out, which previously left the server copy missing.
    const CHUNK = 50;
    for (let i = 0; i < newUsers.length; i += CHUNK) {
      syncBatchChunk(newUsers.slice(i, i + CHUNK));
    }
    return newUsers;
  }, []);

  const deleteUser = useCallback((id: string) => {
    persistFn(prev => prev.filter(u => u.id !== id));
    bgFetch(`/users/${id}`, { method: 'DELETE' });
  }, []);

  const toggleStatus = useCallback((id: string) => {
    let newStatus: 'active' | 'blocked' | undefined;
    persistFn(prev => prev.map(u => {
      if (u.id !== id) return u;
      newStatus = u.status === 'active' ? 'blocked' : 'active';
      return { ...u, status: newStatus };
    }));
    if (newStatus) bgFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
  }, []);

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