import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
async function syncBatchChunk(users: ManagedUser[], attempt = 0): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/users/batch`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(users),
    });
    if (res.status === 401) { window.dispatchEvent(new Event('session-expired')); return false; }
    if (!res.ok) throw new Error(await res.text());
    return true;
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      return syncBatchChunk(users, attempt + 1);
    }
    console.warn('Batch chunk failed after retries:', e);
    toast.error('Не все пользователи сохранились на сервере (нет связи). Они сохранены локально — при восстановлении связи откройте заявку и нажмите «Сохранить».');
    return false;
  }
}

// Background sync to server; returns true only when the server confirmed the write
// (2xx). Failures surface as a single throttled toast (UI stays responsive).
async function bgFetch(path: string, init?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      return false;
    }
    if (!res.ok) {
      const body = await res.text();
      console.warn(`User sync ${path} failed:`, body);
      toast.error('Не удалось сохранить изменения на сервере. Локально сохранено — повторите позже.');
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`User sync ${path} error:`, e);
    toast.error('Нет связи с сервером. Изменения сохранены локально.');
    return false;
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
  /** Force a fresh pull of users from the server (e.g. to refresh last-login). */
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType>({
  users: INITIAL_USERS,
  allUsers: INITIAL_USERS,
  addUser: () => {},
  addUsersBatch: () => [],
  updateUser: () => {},
  deleteUser: () => {},
  toggleStatus: () => {},
  refreshUsers: async () => {},
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

  // Always-current mirror of allUsers, so mutations can read the latest record
  // synchronously without reading a value assigned inside a setState updater.
  const allUsersRef = useRef(allUsers);
  allUsersRef.current = allUsers;

  // Ids whose server write (create/update) hasn't been confirmed yet. syncFromServer
  // must NOT drop/overwrite these with the (stale or absent) server copy, or a
  // just-added user / just-saved edit reverts on the next pull (people "fly off"
  // заявки and the count jumps). Cleared once the server confirms (2xx).
  const pendingWrites = useRef<Set<string>>(new Set());
  // Ids the admin deleted whose DELETE hasn't been confirmed on the server. Kept out
  // of the merge, PERSISTED to localStorage, and re-issued on every sync — so a
  // delete that didn't land (e.g. expired admin session) is retried until the user
  // is truly removed; otherwise they reappear on reload and can still log in.
  const pendingDeletes = useRef<Set<string>>(new Set(
    (() => { try { return JSON.parse(localStorage.getItem('kazskills_pending_deletes') || '[]') as string[]; } catch { return []; } })()
  ));
  const savePendingDeletes = () => {
    try { localStorage.setItem('kazskills_pending_deletes', JSON.stringify([...pendingDeletes.current])); } catch {}
  };

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
      // no-store: the user list must be fresh every sync — a cached response
      // hides recent changes (e.g. a just-uploaded photo shows as "no photo").
      const res = await fetch(`${BASE}/users`, { headers: authHeaders(), cache: 'no-store' });
      if (res.status === 401) {
        window.dispatchEvent(new Event('session-expired'));
        return;
      }
      if (!res.ok) return;
      const data: ManagedUser[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Merge, don't clobber. The server list is authoritative EXCEPT for
        // operations the client hasn't had confirmed yet:
        //  • pendingWrites  → keep the local copy (edit/add not yet acked)
        //  • pendingDeletes → drop it (delete not yet acked) so it doesn't return
        //  • pending local-only adds → re-append (not on the server yet)
        setAllUsers(prev => {
          const localById = new Map(prev.map(u => [u.id, u]));
          const seen = new Set<string>();
          const merged: ManagedUser[] = [];
          for (const srv of data) {
            if (pendingDeletes.current.has(srv.id)) continue;
            seen.add(srv.id);
            merged.push(pendingWrites.current.has(srv.id) ? (localById.get(srv.id) ?? srv) : srv);
          }
          for (const u of prev) {
            if (!seen.has(u.id) && pendingWrites.current.has(u.id) && !pendingDeletes.current.has(u.id)) {
              merged.push(u);
            }
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });

        // Durable delete: re-issue any DELETE that hasn't landed on the server yet
        // (and clear ids the server has already removed).
        for (const id of [...pendingDeletes.current]) {
          if (data.some(u => u.id === id)) {
            bgFetch(`/users/${id}`, { method: 'DELETE' }).then(ok => {
              if (ok) { pendingDeletes.current.delete(id); savePendingDeletes(); }
            });
          } else {
            pendingDeletes.current.delete(id);
            savePendingDeletes();
          }
        }
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
    pendingWrites.current.add(newUser.id);
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (await bgFetch('/users', { method: 'POST', body: JSON.stringify(newUser) })) {
          pendingWrites.current.delete(newUser.id);
          return;
        }
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
    })();
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<ManagedUser>) => {
    // Optimistic local update (functional form, so a synchronous loop of edits —
    // e.g. saving every member of a заявка — all accumulate correctly).
    persistFn(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    // CRITICAL: fire the PUT UNCONDITIONALLY. Never gate it on a value assigned
    // inside the setState updater — React's eager-state bailout runs that updater
    // synchronously only for the FIRST dispatch in a tick, so in a loop calls 2..N
    // would read `undefined` and silently skip the write (the bug that made bulk
    // course/заявка edits revert). We send ONLY the changed fields; the server
    // merges them into the existing record, so a partial body is complete & correct.
    pendingWrites.current.add(id);
    const body = JSON.stringify({ ...updates, id });
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (await bgFetch(`/users/${id}`, { method: 'PUT', body })) {
          pendingWrites.current.delete(id);
          return;
        }
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
      // Still unconfirmed after retries — leave it marked dirty so the next
      // server pull preserves the local edit rather than reverting it.
    })();
  }, []);

  const addUsersBatch = useCallback((
    batch: BatchUserInput[],
    org: string,
    department: string,
    requestNumber: string,
  ): ManagedUser[] => {
    const now = new Date().toISOString().slice(0, 10);
    // Guarantee unique logins: the random 6-digit generator in the UI can collide
    // with an existing user (that broke a person's login). Re-roll any login that
    // clashes with an existing user OR another login in this same batch.
    const taken = new Set(allUsersRef.current.map(u => u.email));
    const newUsers: ManagedUser[] = batch.map((b, i) => {
      let login = (b.login || '').trim();
      while (!/^\d{6}$/.test(login) || taken.has(login)) {
        login = String(Math.floor(100000 + Math.random() * 900000));
      }
      taken.add(login);
      return {
        id: `batch-${Date.now()}-${i}`,
        email: login,
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
      };
    });
    persistFn(prev => [...prev, ...newUsers]);
    // Protect the new users from being dropped by a concurrent server pull until
    // their chunk is confirmed. Sync in chunks — a single huge POST (e.g. 400 users)
    // can exceed payload limits or time out, which previously left them missing.
    newUsers.forEach(u => pendingWrites.current.add(u.id));
    const CHUNK = 50;
    for (let i = 0; i < newUsers.length; i += CHUNK) {
      const chunk = newUsers.slice(i, i + CHUNK);
      syncBatchChunk(chunk).then(ok => { if (ok) chunk.forEach(u => pendingWrites.current.delete(u.id)); });
    }
    return newUsers;
  }, []);

  const deleteUser = useCallback((id: string) => {
    persistFn(prev => prev.filter(u => u.id !== id));
    // Keep it gone across pulls until the server confirms the delete, and persist
    // the pending delete so a failed attempt is retried on the next sync.
    pendingDeletes.current.add(id);
    savePendingDeletes();
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (await bgFetch(`/users/${id}`, { method: 'DELETE' })) {
          pendingDeletes.current.delete(id);
          savePendingDeletes();
          return;
        }
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
    })();
  }, []);

  const toggleStatus = useCallback((id: string) => {
    const cur = allUsersRef.current.find(u => u.id === id);
    if (!cur) return;
    const newStatus: 'active' | 'blocked' = cur.status === 'active' ? 'blocked' : 'active';
    persistFn(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    pendingWrites.current.add(id);
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (await bgFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus, id }) })) {
          pendingWrites.current.delete(id);
          return;
        }
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
    })();
  }, []);

  return (
    <UsersContext.Provider value={{ users, allUsers, addUser, addUsersBatch, updateUser, deleteUser, toggleStatus, refreshUsers: syncFromServer }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  return useContext(UsersContext);
}

export { INITIAL_USERS };