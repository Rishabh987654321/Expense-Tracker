import env from '../config/env.js';
import { adminPrisma, withTenant } from '../config/prisma.js';
import { HttpError } from './errorHandler.js';

// Cache slug -> orgId to avoid one DB hit per request. The cache is small and
// only invalidated on org rename/delete (out of scope for MVP).
const slugCache = new Map();

function extractSlugFromHost(host) {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();
  // Header may be 'X-Tenant-Slug' instead — handled by caller.
  const parts = hostname.split('.');
  if (parts.length < 2) return null;
  // For *.localhost (single label preceding `localhost`), parts.length === 2.
  // For acme.app.com -> parts = ['acme', 'app', 'com'] -> first label is slug.
  // For app.com (no subdomain) -> parts = ['app', 'com'] -> not a tenant.
  if (hostname.endsWith('.localhost')) {
    return parts[0];
  }
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

async function resolveOrgIdBySlug(slug) {
  if (!slug) return null;
  if (slugCache.has(slug)) return slugCache.get(slug);
  const org = await adminPrisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!org) return null;
  slugCache.set(slug, org);
  return org;
}

// Populates `req.tenant = { slug, orgId, orgName } | null` based on the Host
// header (preferred) or X-Tenant-Slug (used when calling the API from a tool
// without DNS magic). Reserved subdomains (e.g. "app", "www") never resolve to
// a tenant. This middleware NEVER opens a transaction or sets the GUC; that's
// done after JWT verification by `requireTenantContext`.
export async function resolveTenantFromHost(req, _res, next) {
  try {
    const headerSlug = (req.headers['x-tenant-slug'] || '').toString().trim().toLowerCase();
    const hostSlug = extractSlugFromHost(req.headers.host);
    const slug = (headerSlug || hostSlug || '').toLowerCase();

    if (!slug || env.reservedSubdomains.includes(slug)) {
      req.tenant = null;
      return next();
    }
    const org = await resolveOrgIdBySlug(slug);
    if (!org) {
      req.tenant = null;
      req.tenantSlug = slug;
      return next();
    }
    req.tenant = { slug: org.slug, orgId: org.id, orgName: org.name };
    return next();
  } catch (err) {
    return next(err);
  }
}

// Use on routes that REQUIRE a tenant subdomain to be resolved.
export function requireTenant(req, _res, next) {
  if (!req.tenant) {
    return next(new HttpError(404, 'Unknown organization (subdomain)'));
  }
  return next();
}

// Use on routes that REQUIRE the request to have come from a non-tenant
// (root / "app") host. Used for org signup and invite acceptance.
export function requirePublicHost(req, _res, next) {
  if (req.tenant) {
    return next(new HttpError(400, 'This endpoint is only available on the public host'));
  }
  return next();
}

// Wraps the rest of the request in a tenant context (AsyncLocalStorage).
// Must run AFTER both `resolveTenantFromHost` and `requireAuth` so we can
// cross-check that req.user.orgId === req.tenant.orgId.
export function enterTenantContext(req, res, next) {
  if (!req.tenant || !req.user) return next(new HttpError(401, 'Not authenticated'));
  if (req.tenant.orgId !== req.user.orgId) {
    return next(new HttpError(403, 'JWT org does not match host org'));
  }
  withTenant(
    { orgId: req.user.orgId, userId: req.user.userId, role: req.user.role },
    () => next()
  );
}

export function clearSlugCache(slug) {
  if (slug) slugCache.delete(slug);
  else slugCache.clear();
}
