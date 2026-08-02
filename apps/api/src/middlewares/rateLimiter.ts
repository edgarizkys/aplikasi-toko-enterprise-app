import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup old entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ip, record);

  const remaining = Math.max(0, MAX_REQUESTS - record.count);
  const retryAfter = Math.ceil((record.resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', record.resetTime);

  if (record.count > MAX_REQUESTS) {
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
      },
    });
    return;
  }

  next();
}

export default rateLimiter;