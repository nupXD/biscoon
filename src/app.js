require('express-async-errors');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const {
  CORS_ORIGINS,
  JSON_BODY_LIMIT,
  NODE_ENV,
  STATIC_ROOT,
  TRUST_PROXY,
  UPLOAD_DIR,
  isProduction,
} = require('./config/env');
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const discussionRoutes = require('./routes/discussions');
const notificationRoutes = require('./routes/notifications');
const activityRoutes = require('./routes/activity');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');
const marketRoutes = require('./routes/market');
const moderationRoutes = require('./routes/moderation');
const newsRoutes = require('./routes/news');

const app = express();

const allowedOrigins = CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
const staticOptions = {
  etag: true,
  maxAge: isProduction ? '1d' : 0,
};

app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', TRUST_PROXY);

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", 'https://ipapi.co'],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (NODE_ENV === 'test') return;
    const duration = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});
app.use('/assets', express.static(path.join(STATIC_ROOT, 'assets'), staticOptions));
app.use('/pages', express.static(path.join(STATIC_ROOT, 'pages'), staticOptions));
app.use(`/${UPLOAD_DIR}`, express.static(path.join(STATIC_ROOT, UPLOAD_DIR), {
  ...staticOptions,
  fallthrough: false,
}));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'biscoon',
    env: NODE_ENV,
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    ok: databaseConnected,
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/news', newsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('✗ Unhandled error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'An unexpected server error occurred.' });
});

module.exports = app;
