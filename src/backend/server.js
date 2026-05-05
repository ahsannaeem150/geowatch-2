import './src/config/env.js';
import express from 'express';
import cors from 'cors';

import { responseWrapper } from './src/middleware/response-wrapper.js';
import { generalLimiter } from './src/middleware/rate-limiter.js';
import { errorHandler, notFoundHandler } from './src/middleware/error-handler.js';

import healthRoutes from './src/routes/health.routes.js';
import authRoutes from './src/routes/auth.routes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── CORS ───
const allowedOrigins = [
  process.env.USER_WEB_URL || 'http://localhost:5173',
  process.env.ADMIN_WEB_URL || 'http://localhost:5174',
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

// ─── API Routes ───
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);

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
