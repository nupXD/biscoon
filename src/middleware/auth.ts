import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '../config/env';
import { findUserById, sanitizeUser } from '../utils/users';
import type { AuthRequest } from '../types';

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await findUserById(payload.id);
    if (!user) {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }
    (req as AuthRequest).user = sanitizeUser(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export default authMiddleware;
