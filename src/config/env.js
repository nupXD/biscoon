const path = require('path');

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'biscoon_dev_secret',
  MSG_ENCRYPTION_KEY: process.env.MSG_ENCRYPTION_KEY || 'biscoon_msg_encryption_key_dev_32',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/biscoon',
  STATIC_ROOT: path.join(__dirname, '../..'),
};
