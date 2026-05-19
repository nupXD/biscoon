const app = require('./src/app');
const { PORT, isProduction } = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const mongoose = require('mongoose');

process.on('unhandledRejection', (reason) => {
  console.error('✗ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('✗ Uncaught exception:', error);
  process.exit(1);
});

function listenWithFallback(port, attemptsLeft = 10) {
  const numericPort = Number(port);
  const server = app.listen(numericPort, () => {
    console.log(`🚀 Biscoon backend running at http://localhost:${numericPort}`);
  });

  server.on('error', error => {
    if (!isProduction && error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = numericPort + 1;
      console.warn(`⚠️ Port ${numericPort} is busy. Trying ${nextPort}...`);
      listenWithFallback(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('✗ Unable to start Biscoon backend:', error.message);
    process.exit(1);
  });

  function shutdown(signal) {
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
  .then(() => {
    console.log('✓ Connected to MongoDB');
    listenWithFallback(PORT);
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });
