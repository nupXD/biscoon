import { Response, NextFunction } from 'express';
import { EMAIL_VERIFICATION_REQUIRED } from '../config/env';
import type { AuthRequest } from '../types';

function requireVerifiedEmail(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!EMAIL_VERIFICATION_REQUIRED) { next(); return; }
  if (req.user?.emailVerified) { next(); return; }
  res.status(403).json({
    error: 'Please verify your email before posting, commenting, or messaging.',
  });
}

export default requireVerifiedEmail;
