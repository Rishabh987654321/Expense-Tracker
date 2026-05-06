import { verifyAuthToken } from '../utils/jwt.js';
import { HttpError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyAuthToken(token);
    req.user = {
      userId: payload.userId,
      orgId: payload.orgId,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...allowed) {
  const set = new Set(allowed.flat());
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Not authenticated'));
    if (!set.has(req.user.role)) return next(new HttpError(403, 'Insufficient role'));
    return next();
  };
}
