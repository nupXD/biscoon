require('express-async-errors');
const express = require('express');
const cors = require('cors');
const { PORT, STATIC_ROOT } = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const listingRoutes = require('./src/routes/listings');
const discussionRoutes = require('./src/routes/discussions');
const notificationRoutes = require('./src/routes/notifications');
const activityRoutes = require('./src/routes/activity');
const messageRoutes = require('./src/routes/messages');
const adminRoutes         = require('./src/routes/admin');
const announcementRoutes  = require('./src/routes/announcements');
const marketRoutes        = require('./src/routes/market');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.static(STATIC_ROOT));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/market', marketRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler — catches any error passed via next(err) or thrown in async routes
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('✗ Unhandled error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'An unexpected server error occurred.' });
});

// Catch unhandled promise rejections from async route handlers (Express 4 does not forward these)
process.on('unhandledRejection', (reason) => {
  console.error('✗ Unhandled promise rejection:', reason);
});

function listenWithFallback(port, attemptsLeft = 10) {
  const numericPort = Number(port);
  const server = app.listen(numericPort, () => {
    console.log(`🚀 Biscoon backend running at http://localhost:${numericPort}`);
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = numericPort + 1;
      console.warn(`⚠️ Port ${numericPort} is busy. Trying ${nextPort}...`);
      listenWithFallback(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('✗ Unable to start Biscoon backend:', error.message);
    process.exit(1);
  });
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
