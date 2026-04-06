// Very simple fixed-window IP-based rate limiter middleware
// Not production-grade but avoids bursts hanging the service
export default function rateLimiter({ windowMs = 60_000, max = 120 } = {}) {
  const buckets = new Map(); // ip+route -> { count, resetAt }
  return (req, res, next) => {
    const key = `${req.ip || req.connection?.remoteAddress || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    const remaining = Math.max(0, max - b.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(b.resetAt / 1000));
    if (b.count > max) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ message: 'Too many requests, please try again later.', requestId: req.id });
    }
    next();
  };
}
