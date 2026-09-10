import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { findUserById } from './users';

export async function authenticateSession(token: string) {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  if (typeof payload.id !== 'string') throw new Error('Invalid session.');
  const user = await findUserById(payload.id);
  if (!user || user.deleted || (payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
    throw new Error('Session has been revoked.');
  }
  return { user, expiresAt: payload.exp };
}
