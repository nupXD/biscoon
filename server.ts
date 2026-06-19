import app from './src/app';
import { MONGODB_URI, PORT, isProduction } from './src/config/env';
import connectDatabase from './src/config/database';
import mongoose from 'mongoose';
import { ensureIndices, isAvailable } from './src/services/elasticsearch';
import { initRealtime } from './src/services/realtime';
import { captureException, initMonitoring } from './src/config/monitoring';
import { createServer } from 'http';
import type { Server } from 'http';

initMonitoring();

process.on('unhandledRejection', (reason) => {
  captureException(reason, { source: 'unhandledRejection' });
  console.error('✗ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  captureException(error, { source: 'uncaughtException' });
  console.error('✗ Uncaught exception:', error);
  process.exit(1);
});

function listenWithFallback(port: string | number, attemptsLeft = 10): Server {
  const numericPort = Number(port);
  const server = createServer(app);
  initRealtime(server);

  server.listen(numericPort, () => {
    console.log(`🚀 Biscoon backend running at http://localhost:${numericPort}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (!isProduction && error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = numericPort + 1;
      console.warn(`⚠️ Port ${numericPort} is busy. Trying ${nextPort}...`);
      listenWithFallback(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('✗ Unable to start Biscoon backend:', error.message);
    process.exit(1);
  });

  function shutdown(signal: string): void {
    console.log(`${signal} received. Closing HTTP server...`);
    server.close(async () => {
      await mongoose.disconnect();
      console.log('✓ Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('✗ Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  return server;
}

connectDatabase()
  .then(async () => {
    console.log('✓ Connected to MongoDB');
    if (await isAvailable()) {
      await ensureIndices();
      console.log('✓ Elasticsearch ready');
    } else {
      console.log('ℹ Elasticsearch not configured — using MongoDB text search');
    }
    listenWithFallback(PORT);
  })
  .catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    captureException(err, { source: 'databaseStartup' });
    console.error('✗ MongoDB connection error:', message);
    if (!isProduction && /ECONNREFUSED|ServerSelection/i.test(message)) {
      console.error(`MongoDB is not running at ${MONGODB_URI}.`);
      console.error('Start it in another terminal with: npm run mongo');
      console.error('Then run the app with: npm run dev');
    }
    process.exit(1);
  });
