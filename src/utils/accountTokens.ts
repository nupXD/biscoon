import crypto from 'crypto';

interface AccountToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

function hashAccountToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');
}

function createAccountToken(hoursToLive = 24): AccountToken {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashAccountToken(token),
    expiresAt: new Date(Date.now() + hoursToLive * 60 * 60 * 1000),
  };
}

function tokenIsFresh(expiresAt: Date | string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > Date.now();
}

export {
  createAccountToken,
  hashAccountToken,
  tokenIsFresh,
};
