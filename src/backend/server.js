import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { responseWrapper } from './src/middleware/response-wrapper.js';
import { generalLimiter } from './src/middleware/rate-limiter.js';
import { errorHandler, notFoundHandler } from './src/middleware/error-handler.js';

import healthRoutes from './src/routes/health.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import publicAuthRoutes from './src/routes/public-auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import publicUserRoutes from './src/routes/public-user.routes.js';
import auditRoutes from './src/routes/audit.routes.js';
import systemRoutes from './src/routes/system.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import incidentRoutes from './src/routes/incident.routes.js';
import savedIncidentRoutes from './src/routes/saved-incident.routes.js';
import timelineRoutes from './src/routes/timeline.routes.js';
import sourceRoutes from './src/routes/source.routes.js';
import publicSourceRoutes from './src/routes/source-public.routes.js';

import mediaRoutes from './src/routes/media.routes.js';
import zoneCategoryRoutes from './src/routes/zone-category.routes.js';
import xArchiveDebugRoutes from './src/routes/x-archive-debug.routes.js';
import { addClient, removeClient } from './src/utils/sse-broadcast.js';
import { authenticate } from './src/middleware/auth.middleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── CORS ───
const allowedOrigins = [
  process.env.USER_WEB_URL || 'http://localhost:5173',
  process.env.ADMIN_WEB_URL || 'http://localhost:5174',
  process.env.SUPERADMIN_WEB_URL || 'http://localhost:5175',
  // Vite preview ports
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development, accept any origin so localhost, 127.0.0.1, and LAN IPs all work
      if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Response Wrapper ───
app.use(responseWrapper);

// ─── SSE Stream Endpoint (before rate limiter — long-lived connections should not count toward the general limit) ───
app.get('/api/v1/incidents/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial heartbeat
  res.write(': connected\n\n');

  addClient(res);

  req.on('close', () => {
    removeClient(res);
  });
});

// ─── Static File Serving (uploads) ───
// Serve user-generated content BEFORE rate limiting so images don't count toward API limits
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../uploads');
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',
  immutable: true,
}));

// ─── Rate Limiting (applied to all API routes, NOT the SSE stream or static files) ───
app.use(generalLimiter);

// ─── API Routes ───
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/public', publicAuthRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/public-users', publicUserRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/incidents', savedIncidentRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/incidents/:id/timeline', timelineRoutes);
app.use('/api/v1/incidents/:id/sources/public', publicSourceRoutes);
app.use('/api/v1/incidents/:id/sources', sourceRoutes);
app.use('/api/v1/incidents/:id/media', mediaRoutes);
app.use('/api/v1/zone-categories', zoneCategoryRoutes);
app.use('/api/v1/x-archive-debug', xArchiveDebugRoutes);

// ─── 404 Handler ───
app.use(notFoundHandler);

// ─── Error Handler (must be last) ───
app.use(errorHandler);

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`🚀 GeoWatch API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
});
