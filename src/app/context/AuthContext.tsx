import React, { createContext, useContext, useState, useCallback } from 'react';
import { getOrganizationSlug, slugForLegacyOrgName } from '../lib/organization';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const USERS_API = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c/users`;
const USERS_HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

export type UserRole = 'admin' | 'student';

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; reason: 'invalid' | 'wrong_tenant' };

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  position?: string;
  phone?: string;
  organization: string;
  enrolledCourses: string[];
  completedCourses: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const MOCK_USERS: (User & { password: string })[] = [
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
  },
  {
    id: 'student-002',
    email: 'alma@kazskills.kz',
    password: 'Student1234',
    name: 'Байжанова Алма Кариповна',
    role: 'student',
    organization: 'Kazskills',
    department: 'Технологический отдел',
    phone: '+7 (702) 345-67-89',
    enrolledCourses: ['course-001', 'course-002'],
    completedCourses: [],
  },
  {
    id: 'student-003',
    email: 'daniyar@kazskills.kz',
    password: 'Student1234',
    name: 'Жаксыбеков Данияр Серикович',
    role: 'student',
    organization: 'Kazskills',
    department: 'Нефтегазовый отдел',
    phone: '+7 (705) 456-78-90',
    enrolledCourses: ['course-002', 'course-003', 'course-004'],
    completedCourses: ['course-002'],
  },
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ ok: false as const, reason: 'invalid' as const }),
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kazskills_user');
    if (!saved) return null;
    try {
      const parsed: User = JSON.parse(saved);
      // If we're on a tenant subdomain, the restored user must belong to it.
      const tenantSlug = getOrganizationSlug();
      if (tenantSlug) {
        const userSlug = slugForLegacyOrgName(parsed.organization);
        if (userSlug !== tenantSlug) {
          localStorage.removeItem('kazskills_user');
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const tenantSlug = getOrganizationSlug();

    const acceptIfTenantMatches = (candidate: User): LoginResult => {
      if (tenantSlug) {
        const userSlug = slugForLegacyOrgName(candidate.organization);
        if (userSlug !== tenantSlug) {
          return { ok: false, reason: 'wrong_tenant' };
        }
      }
      setUser(candidate);
      localStorage.setItem('kazskills_user', JSON.stringify(candidate));
      return { ok: true, role: candidate.role };
    };

    const matchInList = (list: any[]) =>
      list.find(u => u.email === email && u.password === password && u.status !== 'blocked');

    // 1. Server (source of truth)
    try {
      const res = await fetch(USERS_API, { headers: USERS_HEADERS });
      if (res.ok) {
        const remote = await res.json();
        const found = matchInList(Array.isArray(remote) ? remote : []);
        if (found) {
          const { password: _, status: __, createdAt: ___, ...userWithoutPass } = found;
          return acceptIfTenantMatches(userWithoutPass);
        }
      }
    } catch (e) {
      console.warn('Server login lookup failed, falling back to cache:', e);
    }

    // 2. localStorage cache (offline / pre-sync fallback)
    try {
      const stored = localStorage.getItem('kazskills_managed_users');
      if (stored) {
        const found = matchInList(JSON.parse(stored));
        if (found) {
          const { password: _, status: __, createdAt: ___, ...userWithoutPass } = found;
          return acceptIfTenantMatches(userWithoutPass);
        }
      }
    } catch {}

    // 3. Hardcoded MOCK_USERS (initial bootstrap)
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userWithoutPass } = found;
      return acceptIfTenantMatches(userWithoutPass);
    }
    return { ok: false, reason: 'invalid' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('kazskills_user');
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('kazskills_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { MOCK_USERS };