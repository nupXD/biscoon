import { Request, Response, NextFunction } from 'express';
import { sanitizeUser } from '../utils/users';
import { authenticateSession } from '../utils/sessions';
import type { AuthRequest } from '../types';

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const { user } = await authenticateSession(token);
    (req as AuthRequest).user = sanitizeUser(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export default authMiddleware;
