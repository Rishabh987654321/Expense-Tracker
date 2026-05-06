import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAuthToken({ userId, orgId, role }) {
  return jwt.sign({ userId, orgId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
