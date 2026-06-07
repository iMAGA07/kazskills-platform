import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getOrganizationSlug, slugForLegacyOrgName } from '../lib/organization';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from '../components/shared/Toast';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;
const SUPABASE_HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

const USER_KEY = 'kazskills_user';
const TOKEN_KEY = 'kazskills_token';

export type UserRole = 'admin' | 'student' | 'representative';

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
  /** ISO timestamp of the last successful login (stamped by the server). */
  lastLoginAt?: string;
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
    const saved = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    // Old sessions without a token were created before server-side auth was added.
    // Force a fresh login so the user gets a real token.
    if (!saved || !token) {
      if (saved) localStorage.removeItem(USER_KEY);
      return null;
    }
    try {
      const parsed: User = JSON.parse(saved);
      const tenantSlug = getOrganizationSlug();
      if (tenantSlug) {
        const userSlug = slugForLegacyOrgName(parsed.organization);
        if (userSlug !== tenantSlug) {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Listen for global session-expired events from any context that hit a 401.
  useEffect(() => {
    const onExpired = () => {
      if (user) {
        toast.error('Сессия истекла. Войдите снова.');
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const tenantSlug = getOrganizationSlug();

    const acceptIfTenantMatches = (candidate: User, token: string): LoginResult => {
      if (tenantSlug) {
        const userSlug = slugForLegacyOrgName(candidate.organization);
        if (userSlug !== tenantSlug) {
          // Drop the freshly issued token — wrong tenant should not get to keep it.
          fetch(`${BASE}/auth/logout`, {
            method: 'POST',
            headers: { ...SUPABASE_HEADERS, 'x-session-token': token },
          }).catch(() => {});
          return { ok: false, reason: 'wrong_tenant' };
        }
      }
      setUser(candidate);
      localStorage.setItem(USER_KEY, JSON.stringify(candidate));
      localStorage.setItem(TOKEN_KEY, token);
      window.dispatchEvent(new Event('auth-changed'));
      return { ok: true, role: candidate.role };
    };

    const tryServerLogin = async (): Promise<{ token: string; user: User } | null> => {
      try {
        const res = await fetch(`${BASE}/auth/login`, {
          method: 'POST',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          const data = await res.json();
          return { token: data.token, user: data.user };
        }
        return null;
      } catch (e) {
        console.warn('Server /auth/login error:', e);
        return null;
      }
    };

    // 1. Try server.
    let result = await tryServerLogin();

    // 2. If unauthorized AND the server hasn't been seeded yet, seed and retry once.
    if (!result) {
      try {
        const seedRes = await fetch(`${BASE}/users/seed`, {
          method: 'POST',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify(MOCK_USERS),
        });
        if (seedRes.ok) {
          const info = await seedRes.json();
          if (info?.seeded) result = await tryServerLogin();
        }
      } catch (e) {
        console.warn('Server seed-on-login failed:', e);
      }
    }

    if (result) {
      return acceptIfTenantMatches(result.user, result.token);
    }
    return { ok: false, reason: 'invalid' };
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-changed'));
    if (token) {
      // Best-effort server-side invalidation; we don't block the UI on it.
      fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'x-session-token': token },
      }).catch(() => {});
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
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