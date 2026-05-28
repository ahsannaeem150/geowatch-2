import './src/config/env.js';
import express from 'express';
import cors from 'cors';

import { responseWrapper } from './src/middleware/response-wrapper.js';
import { generalLimiter } from './src/middleware/rate-limiter.js';
import { errorHandler, notFoundHandler } from './src/middleware/error-handler.js';

import healthRoutes from './src/routes/health.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import incidentRoutes from './src/routes/incident.routes.js';
import timelineRoutes from './src/routes/timeline.routes.js';
import sourceRoutes from './src/routes/source.routes.js';
import { addClient, removeClient } from './src/utils/sse-broadcast.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── CORS ───
const allowedOrigins = [
  process.env.USER_WEB_URL || 'http://localhost:5173',
  process.env.ADMIN_WEB_URL || 'http://localhost:5174',
  process.env.SUPERADMIN_WEB_URL || 'http://localhost:5175',
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Response Wrapper ───
app.use(responseWrapper);

// ─── Rate Limiting ───
app.use(generalLimiter);

// ─── SSE Stream Endpoint (must be before incident routes to avoid /:id collision) ───
app.get('/api/v1/incidents/stream', (req, res) => {
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

// ─── API Routes ───
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/incidents/:id/timeline', timelineRoutes);
app.use('/api/v1/incidents/:id/sources', sourceRoutes);

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
