export interface Organization {
  slug: string;
  displayName: string;
  fullName: string;
  legacyAliases: string[];
}

export const ORGANIZATIONS: Organization[] = [
  {
    slug: 'kazskills',
    displayName: 'Kazskills',
    fullName: 'Kazskills',
    legacyAliases: ['Kazskills', 'kazskills'],
  },
  {
    slug: 'kmg',
    displayName: 'КазМунайГаз',
    fullName: 'АО «КазМунайГаз»',
    legacyAliases: ['АО «КазМунайГаз»', 'КазМунайГаз', 'KMG'],
  },
  {
    slug: 'kaztransoil',
    displayName: 'Казтрансойл',
    fullName: 'АО «Казтрансойл»',
    legacyAliases: ['АО «Казтрансойл»', 'Казтрансойл', 'KazTransOil'],
  },
  {
    slug: 'tengiz',
    displayName: 'Тенгизшевройл',
    fullName: 'ТОО «Тенгизшевройл»',
    legacyAliases: ['ТОО «Тенгизшевройл»', 'Тенгизшевройл', 'Tengizchevroil'],
  },
  {
    slug: 'samruk',
    displayName: 'Самрук-Энерго',
    fullName: 'АО «Самрук-Энерго»',
    legacyAliases: ['АО «Самрук-Энерго»', 'Самрук-Энерго', 'Samruk-Energy'],
  },
  {
    slug: 'astana',
    displayName: 'Astana',
    fullName: 'Astana',
    legacyAliases: ['Astana'],
  },
];

/** Subdomain from current host, or null on root/localhost. */
export function getOrganizationSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  // localhost, IPv4, IPv6 (literal or bracketed), and *.local — treat as no tenant.
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
  const normalized = orgName.trim();
  const hit = ORGANIZATIONS.find(o =>
    o.legacyAliases.some(a => a.toLowerCase() === normalized.toLowerCase()) ||
    o.fullName.toLowerCase() === normalized.toLowerCase() ||
    o.displayName.toLowerCase() === normalized.toLowerCase()
  );
  return hit?.slug ?? null;
}

/**
 * Does a user (by their `organization` string) belong to the current tenant?
 * - On root domain (no subdomain) — always true (super-admin view).
 * - On a tenant subdomain — true only if user's org-slug matches.
 */
export function userBelongsToCurrentTenant(userOrganization: string | undefined): boolean {
  const currentSlug = getOrganizationSlug();
  if (!currentSlug) return true; // root domain — show everything
  const userSlug = slugForLegacyOrgName(userOrganization);
  return userSlug === currentSlug;
}
