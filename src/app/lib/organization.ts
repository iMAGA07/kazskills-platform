import { useEffect, useReducer } from 'react';

export interface Organization {
  slug: string;
  displayName: string;
  fullName: string;
  legacyAliases?: string[];
  createdAt?: string;
}

// ─── Default seed (used until the server returns its own list) ─────────────────
export const DEFAULT_ORGANIZATIONS: Organization[] = [
  { slug: 'kazskills',  displayName: 'Kazskills',     fullName: 'Kazskills',
    legacyAliases: ['Kazskills', 'kazskills'] },
  { slug: 'kmg',        displayName: 'КазМунайГаз',   fullName: 'АО «КазМунайГаз»',
    legacyAliases: ['АО «КазМунайГаз»', 'КазМунайГаз', 'KMG'] },
  { slug: 'kaztransoil',displayName: 'Казтрансойл',   fullName: 'АО «Казтрансойл»',
    legacyAliases: ['АО «Казтрансойл»', 'Казтрансойл', 'KazTransOil'] },
  { slug: 'tengiz',     displayName: 'Тенгизшевройл', fullName: 'ТОО «Тенгизшевройл»',
    legacyAliases: ['ТОО «Тенгизшевройл»', 'Тенгизшевройл', 'Tengizchevroil'] },
  { slug: 'samruk',     displayName: 'Самрук-Энерго', fullName: 'АО «Самрук-Энерго»',
    legacyAliases: ['АО «Самрук-Энерго»', 'Самрук-Энерго', 'Samruk-Energy'] },
  { slug: 'astana',     displayName: 'Astana',        fullName: 'Astana',
    legacyAliases: ['Astana'] },
];

const STORAGE_KEY = 'kazskills_organizations';
const ORG_CHANGED_EVENT = 'organizations-changed';

// ─── Module-level mutable cache ────────────────────────────────────────────────
let ORGANIZATIONS: Organization[] = (() => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ORGANIZATIONS;
})();

export function getOrganizations(): Organization[] {
  return ORGANIZATIONS;
}

/** Overwrites the in-memory registry, persists to localStorage, and notifies subscribers. */
export function setOrganizations(orgs: Organization[]) {
  ORGANIZATIONS = orgs;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs)); } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORG_CHANGED_EVENT));
  }
}

/** React hook: re-renders when the registry changes. */
export function useOrganizations(): Organization[] {
  const [_, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    window.addEventListener(ORG_CHANGED_EVENT, l);
    return () => window.removeEventListener(ORG_CHANGED_EVENT, l);
  }, []);
  return ORGANIZATIONS;
}

// ─── Tenant detection ──────────────────────────────────────────────────────────
/** Subdomain from current host, or null on root/localhost. */
export function getOrganizationSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.includes('[') || host.includes(']') || host.includes(':') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) return null;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === 'www' || sub === 'kazskills') return null;
  return sub;
}

export function getOrganizationBySlug(slug: string | null): Organization | null {
  if (!slug) return null;
  return ORGANIZATIONS.find(o => o.slug === slug) ?? null;
}

export function getCurrentOrganization(): Organization | null {
  return getOrganizationBySlug(getOrganizationSlug());
}

/** Display name for the badge — falls back to capitalized slug for unknown tenants. */
export function getOrganizationName(): string | null {
  const slug = getOrganizationSlug();
  if (!slug) return null;
  const known = getOrganizationBySlug(slug);
  if (known) return known.displayName;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Resolve a user's legacy `organization` string to a slug, if recognized. */
export function slugForLegacyOrgName(orgName: string | undefined | null): string | null {
  if (!orgName) return null;
  const normalized = orgName.trim().toLowerCase();
  const hit = ORGANIZATIONS.find(o =>
    o.fullName.toLowerCase() === normalized ||
    o.displayName.toLowerCase() === normalized ||
    (o.legacyAliases ?? []).some(a => a.toLowerCase() === normalized)
  );
  return hit?.slug ?? null;
}

/**
 * Does a user (by their `organization` string) belong to the current tenant?
 * On root domain (no subdomain) — always true (super-admin view).
 */
export function userBelongsToCurrentTenant(userOrganization: string | undefined): boolean {
  const currentSlug = getOrganizationSlug();
  if (!currentSlug) return true;
  const userSlug = slugForLegacyOrgName(userOrganization);
  return userSlug === currentSlug;
}

// ─── Legacy export (kept for any older imports) ────────────────────────────────
export { ORGANIZATIONS };
