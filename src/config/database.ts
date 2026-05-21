import mongoose from 'mongoose';
import { MONGODB_URI } from './env';

async function connectDatabase(): Promise<void> {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✓ MongoDB reconnected');
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('✗ MongoDB connection error:', err.message);
  });
}

export default connectDatabase;
