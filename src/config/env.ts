import 'dotenv/config';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function clean(value: string | undefined): string | undefined {
  return value && String(value).trim();
}

function getBoolean(name: string, fallback = false): boolean {
  const configured = clean(process.env[name]);
  if (configured === undefined) return fallback;
  return /^(true|1|yes)$/i.test(configured);
}

function getRequiredSecret(name: string, devDefault: string): string {
  const configured = clean(process.env[name]);
  if (configured) {
    if (isProduction && configured.length < 32) {
      throw new Error(`${name} must be at least 32 characters in production.`);
    }
    if (isProduction && /^replace-with-/i.test(configured)) {
      throw new Error(`${name} is still using a placeholder value.`);
    }
    return configured;
  }
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devDefault;
}

function getRequiredProductionValue(name: string, devDefault = ''): string {
  const configured = clean(process.env[name]);
  if (configured) return configured;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devDefault;
}

export {
  NODE_ENV,
  isProduction,
};

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = getRequiredSecret('JWT_SECRET', 'biscoon_dev_secret');
export const MSG_ENCRYPTION_KEY = getRequiredSecret('MSG_ENCRYPTION_KEY', 'biscoon_msg_encryption_key_dev_32');
export const MONGODB_URI = getRequiredProductionValue('MONGODB_URI', 'mongodb://localhost:27017/biscoon');
export const CORS_ORIGINS = getRequiredProductionValue('CORS_ORIGINS', '');
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';
export const EMAIL_VERIFICATION_REQUIRED = NODE_ENV === 'test'
  ? false
  : getBoolean('EMAIL_VERIFICATION_REQUIRED', true);
export const SMTP_HOST = clean(process.env.SMTP_HOST) || '';
export const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
export const SMTP_USER = clean(process.env.SMTP_USER) || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_SECURE = getBoolean('SMTP_SECURE', SMTP_PORT === 465);
export const MAIL_FROM = clean(process.env.MAIL_FROM) || 'Biscoon <noreply@biscoon.com>';
export const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '25mb';
export const TRUST_PROXY = process.env.TRUST_PROXY || (isProduction ? '1' : '');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
// Compiled files live in dist/src/config; ts-node uses src/config.
export const STATIC_ROOT = path.resolve(
  __dirname,
  __dirname.includes(`${path.sep}dist${path.sep}`) ? '../../..' : '../..'
);
export const SENTRY_DSN = clean(process.env.SENTRY_DSN) || '';
export const SENTRY_TRACES_SAMPLE_RATE = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05');
