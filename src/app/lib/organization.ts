const ORGANIZATIONS: Record<string, string> = {
  astana: 'Astana',
  tengiz: 'Tengiz',
  almaty: 'Almaty',
};

export function getOrganizationSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === 'www' || sub === 'kazskills') return null;
  return sub;
}

export function getOrganizationName(): string | null {
  const slug = getOrganizationSlug();
  if (!slug) return null;
  return ORGANIZATIONS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
