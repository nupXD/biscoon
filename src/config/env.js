const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function getRequiredSecret(name, devDefault) {
  const configured = process.env[name];
  if (configured && String(configured).trim()) return configured;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devDefault;
}

module.exports = {
  NODE_ENV,
  PORT: process.env.PORT || 4000,
  JWT_SECRET: getRequiredSecret('JWT_SECRET', 'biscoon_dev_secret'),
  MSG_ENCRYPTION_KEY: getRequiredSecret('MSG_ENCRYPTION_KEY', 'biscoon_msg_encryption_key_dev_32'),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/biscoon',
  STATIC_ROOT: path.join(__dirname, '../..'),
};
