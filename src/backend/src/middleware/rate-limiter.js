import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter: 300 requests per 1 minute per IP.
 * Applied to all public read endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many requests, please try again later.',
    error: 'RATE_LIMITED',
  },
});

/**
 * Auth rate limiter: 10 requests per 15 minutes per IP.
 * Applied to login and register endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts, please try again later.',
    error: 'RATE_LIMITED',
  },
});

/**
 * Admin write rate limiter: 50 requests per 15 minutes per user.
 * Applied to POST / PATCH / DELETE admin endpoints.
 * Uses the user ID from req.user.id as the key.
 */
export const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    data: null,
    message: 'Too many write operations, please slow down.',
    error: 'RATE_LIMITED',
  },
});
