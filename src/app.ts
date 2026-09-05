import 'express-async-errors';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import {
  CORS_ORIGINS,
  JSON_BODY_LIMIT,
  NODE_ENV,
  STATIC_ROOT,
  TRUST_PROXY,
  UPLOAD_DIR,
  isProduction,
} from './config/env';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import discussionRoutes from './routes/discussions';
import notificationRoutes from './routes/notifications';
import activityRoutes from './routes/activity';
import messageRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import announcementRoutes from './routes/announcements';
import marketRoutes from './routes/market';
import moderationRoutes from './routes/moderation';
import newsRoutes from './routes/news';
import spotlightRoutes from './routes/spotlight';
import weatherRoutes from './routes/weather';
import { captureException } from './config/monitoring';
import { LEGACY_PAGE_REDIRECTS } from './config/legacyPageRedirects';

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
      connectSrc: ["'self'", 'https://ipapi.co', 'https://api.open-meteo.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (NODE_ENV === 'test') return;
    const duration = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(cors({
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.get(['/', '/index.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_ROOT, 'assets', 'favicon.ico'));
});

app.get('/robots.txt', (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_ROOT, 'robots.txt'));
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_ROOT, 'sitemap.xml'));
});

app.get('/llms.txt', (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_ROOT, 'llms.txt'));
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const target = LEGACY_PAGE_REDIRECTS[req.path];
  if (!target) return next();
  return res.redirect(301, target);
});

app.use('/assets', express.static(path.join(STATIC_ROOT, 'assets'), staticOptions));
app.use('/pages', express.static(path.join(STATIC_ROOT, 'pages'), staticOptions));
app.use(`/${UPLOAD_DIR}`, express.static(path.join(STATIC_ROOT, UPLOAD_DIR), {
  ...staticOptions,
  fallthrough: false,
}));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'biscoon',
    env: NODE_ENV,
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', (_req: Request, res: Response) => {
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
app.use('/api/spotlight', spotlightRoutes);
app.use('/api/weather', weatherRoutes);

app.use((req: Request, res: Response) => {
  if (!req.path.startsWith('/api/') && req.accepts('html')) {
    return res.status(404).sendFile(path.join(STATIC_ROOT, '404.html'));
  }
  return res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  captureException(err, { status: err.status || err.statusCode || 500 });
  console.error('✗ Unhandled error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'An unexpected server error occurred.' });
});

export default app;
