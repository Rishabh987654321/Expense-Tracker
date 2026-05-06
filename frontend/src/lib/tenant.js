// Subdomain helpers. The app runs on `*.app.com` (or `*.localhost` in dev).
// Reserved subdomains (e.g. "app", "www") are treated as the public host
// where org signup, login picker, and invite acceptance live.

const RESERVED = new Set(
  (import.meta.env.VITE_RESERVED_SUBDOMAINS || 'app,www')
    .split(',')
    .map((s) => s.trim().toLowerCase())
);

export function getTenantInfo(host = window.location.hostname) {
  const hostname = String(host).toLowerCase();
  const parts = hostname.split('.');
  let slug = null;

  if (hostname.endsWith('.localhost') && parts.length >= 2) {
    slug = parts[0];
  } else if (parts.length >= 3) {
    slug = parts[0];
  }

  const isPublic = !slug || RESERVED.has(slug);
  return { slug: isPublic ? null : slug, isPublic };
}

// Build a URL on a specific tenant's host, preserving port + protocol.
export function tenantUrl(slug, path = '/') {
  const { protocol, port, hostname } = window.location;
  const parts = hostname.split('.');
  let baseHost;
  if (hostname.endsWith('localhost')) {
    baseHost = 'localhost';
  } else {
    baseHost = parts.slice(-2).join('.');
  }
  const finalHost = slug ? `${slug}.${baseHost}` : baseHost;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${finalHost}${portSuffix}${path}`;
}

export function publicUrl(path = '/') {
  return tenantUrl('app', path);
}
