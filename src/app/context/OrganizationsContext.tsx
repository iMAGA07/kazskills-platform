import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  DEFAULT_ORGANIZATIONS, Organization,
  getOrganizations, setOrganizations, useOrganizations,
} from '../lib/organization';
import { toast } from '../components/shared/Toast';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
  const token = localStorage.getItem('kazskills_token');
  if (token) h['x-session-token'] = token;
  return h;
}

interface OrganizationsContextValue {
  organizations: Organization[];
  /** Sync from server (call after login). */
  refetch: () => Promise<void>;
  /** Create a new organization. Returns the created org or throws. */
  createOrganization: (input: { slug: string; displayName: string; fullName: string; logoUrl?: string }) => Promise<Organization>;
  /** Update display/full name and/or logo (slug is immutable). Pass logoUrl: null to clear. */
  updateOrganization: (slug: string, updates: { displayName?: string; fullName?: string; logoUrl?: string | null }) => Promise<Organization>;
  /**
   * Delete an organization. Returns `{ deleted: true }` on success or
   * `{ deleted: false, userCount }` when the org still has members and
   * `force` was not set. Pass `force: true` to delete anyway.
   */
  deleteOrganization: (slug: string, opts?: { force?: boolean }) => Promise<{ deleted: boolean; userCount?: number }>;
  /** Upload a logo file, returns the public URL. */
  uploadLogo: (file: File) => Promise<string>;
}

const Ctx = createContext<OrganizationsContextValue | null>(null);

export function OrganizationsProvider({ children }: { children: React.ReactNode }) {
  const organizations = useOrganizations();

  const refetch = useCallback(async () => {
    // Idempotent seed first so a fresh server picks up the defaults.
    fetch(`${BASE}/organizations/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(DEFAULT_ORGANIZATIONS),
    }).catch(() => {});

    try {
      const res = await fetch(`${BASE}/organizations`, { headers: authHeaders() });
      if (!res.ok) return;
      const data: Organization[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setOrganizations(data);
      }
    } catch (e) {
      console.warn('Organizations sync failed:', e);
    }
  }, []);

  // Initial sync + re-sync on auth changes.
  useEffect(() => {
    refetch();
    const onAuth = () => refetch();
    window.addEventListener('auth-changed', onAuth);
    return () => window.removeEventListener('auth-changed', onAuth);
  }, [refetch]);

  const createOrganization = useCallback(async (input: { slug: string; displayName: string; fullName: string; logoUrl?: string }) => {
    const res = await fetch(`${BASE}/organizations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      throw new Error('Сессия истекла');
    }
    if (!res.ok) throw new Error(data.error ?? 'Не удалось создать организацию');
    setOrganizations([...getOrganizations(), data]);
    toast.success(`Организация «${data.displayName}» создана. Поддомен: ${data.slug}.kazskills.kz`);
    return data;
  }, []);

  const updateOrganization = useCallback(async (slug: string, updates: { displayName?: string; fullName?: string; logoUrl?: string | null }) => {
    // Send `null` as literal so the server can clear the logo; otherwise omit the key.
    const payload: Record<string, any> = {};
    if (updates.displayName !== undefined) payload.displayName = updates.displayName;
    if (updates.fullName    !== undefined) payload.fullName    = updates.fullName;
    if (updates.logoUrl     !== undefined) payload.logoUrl     = updates.logoUrl === null ? '' : updates.logoUrl;

    const res = await fetch(`${BASE}/organizations/${slug}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      throw new Error('Сессия истекла');
    }
    if (!res.ok) throw new Error(data.error ?? 'Не удалось обновить организацию');
    setOrganizations(getOrganizations().map(o => o.slug === slug ? data : o));
    toast.success('Изменения сохранены');
    return data;
  }, []);

  const deleteOrganization = useCallback(async (slug: string, opts?: { force?: boolean }) => {
    const qs = opts?.force ? '?force=true' : '';
    const res = await fetch(`${BASE}/organizations/${slug}${qs}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      throw new Error('Сессия истекла');
    }
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      return { deleted: false, userCount: data.userCount ?? 0 };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Не удалось удалить организацию');
    }
    setOrganizations(getOrganizations().filter(o => o.slug !== slug));
    toast.success('Организация удалена');
    return { deleted: true };
  }, []);

  const uploadLogo = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    // /upload-material is admin-only and returns { url } — perfect for a logo blob.
    const token = localStorage.getItem('kazskills_token');
    const headers: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}` };
    if (token) headers['x-session-token'] = token;
    const res = await fetch(`${BASE}/upload-material`, { method: 'POST', headers, body: formData });
    if (res.status === 401) {
      window.dispatchEvent(new Event('session-expired'));
      throw new Error('Сессия истекла');
    }
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? 'Не удалось загрузить файл');
    return data.url;
  }, []);

  return (
    <Ctx.Provider value={{ organizations, refetch, createOrganization, updateOrganization, deleteOrganization, uploadLogo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrganizationsContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrganizationsContext must be used within OrganizationsProvider');
  return ctx;
}
