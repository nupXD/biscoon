const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✓ MongoDB reconnected');
  });

  mongoose.connection.on('error', err => {
    console.error('✗ MongoDB connection error:', err.message);
  });
}

module.exports = connectDatabase;
