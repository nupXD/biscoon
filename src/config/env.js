require('dotenv').config({ quiet: process.env.NODE_ENV === 'test' });
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function clean(value) {
  return value && String(value).trim();
}

function getRequiredSecret(name, devDefault) {
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

function getRequiredProductionValue(name, devDefault = '') {
  const configured = clean(process.env[name]);
  if (configured) return configured;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devDefault;
}

module.exports = {
  NODE_ENV,
  isProduction,
  PORT: process.env.PORT || 4000,
  JWT_SECRET: getRequiredSecret('JWT_SECRET', 'biscoon_dev_secret'),
  MSG_ENCRYPTION_KEY: getRequiredSecret('MSG_ENCRYPTION_KEY', 'biscoon_msg_encryption_key_dev_32'),
  MONGODB_URI: getRequiredProductionValue('MONGODB_URI', 'mongodb://localhost:27017/biscoon'),
  CORS_ORIGINS: getRequiredProductionValue('CORS_ORIGINS', ''),
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '25mb',
  TRUST_PROXY: process.env.TRUST_PROXY || (isProduction ? '1' : ''),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  STATIC_ROOT: path.join(__dirname, '../..'),
};
