// Tenant helpers.
//
// Local dev: slug comes from subdomain (e.g. acme.localhost).
// Production (free hosting): slug comes from path (e.g. /t/acme/...).
//
// We still support subdomain mode (custom wildcard domain) because it’s the
// “cleanest” SaaS UX, but path mode works without buying a domain.

const RESERVED = new Set(
  (import.meta.env.VITE_RESERVED_SUBDOMAINS || 'app,www')
    .split(',')
    .map((s) => s.trim().toLowerCase())
);

function slugFromPathname(pathname) {
  const path = String(pathname || '/');
  const m = path.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
  return m ? m[1].toLowerCase() : null;
}

function slugFromHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  const parts = host.split('.');
  if (host.endsWith('.localhost') && parts.length >= 2) return parts[0];
  if (parts.length >= 3) return parts[0];
  return null;
}

export function isPathTenantMode(hostname = window.location.hostname) {
  const host = String(hostname || '').toLowerCase();
  if (import.meta.env.VITE_TENANT_MODE) return import.meta.env.VITE_TENANT_MODE === 'path';
  // Default: localhost = subdomain, everything else = path (works on vercel.app)
  return !host.endsWith('localhost');
}

export function getTenantInfo({ host = window.location.hostname, pathname = window.location.pathname } = {}) {
  const hostname = String(host).toLowerCase();

  const slug = isPathTenantMode(hostname) ? slugFromPathname(pathname) : slugFromHost(hostname);
  const isPublic = !slug || RESERVED.has(slug);
  return { slug: isPublic ? null : slug, isPublic };
}

// Build an absolute URL to a tenant.
export function tenantUrl(slug, path = '/') {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const { origin, hostname, protocol, port } = window.location;

  // Path mode (production free hosting): same host, /t/:slug prefix.
  if (isPathTenantMode(hostname)) {
    return `${origin}/t/${encodeURIComponent(cleanSlug)}${cleanPath}`;
  }

  // Subdomain mode (localhost + wildcard custom domains): slug.host
  const parts = hostname.split('.');
  const baseHost = hostname.endsWith('localhost') ? 'localhost' : parts.slice(-2).join('.');
  const finalHost = cleanSlug ? `${cleanSlug}.${baseHost}` : baseHost;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${finalHost}${portSuffix}${cleanPath}`;
}

export function publicUrl(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const { origin, hostname, protocol, port } = window.location;

  // Path mode: public host is just the same origin.
  if (isPathTenantMode(hostname)) return `${origin}${cleanPath}`;

  // Subdomain mode: use reserved "app" host for public pages.
  const parts = hostname.split('.');
  const baseHost = hostname.endsWith('localhost') ? 'localhost' : parts.slice(-2).join('.');
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//app.${baseHost}${portSuffix}${cleanPath}`;
}

// Build an in-app path within the current tenant.
export function tenantPath(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const { slug } = getTenantInfo();
  if (!slug) return cleanPath;
  return isPathTenantMode() ? `/t/${encodeURIComponent(slug)}${cleanPath}` : cleanPath;
}
