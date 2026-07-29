// middleware/rateLimiter.js
const rateLimitMap = new Map();

module.exports = function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000; 
    const maxRequests = 100;

    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
    } else {
        record.count += 1;
    }

    rateLimitMap.set(ip, record);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
        return res.status(429).json({ 
            error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
    }

    next();
};