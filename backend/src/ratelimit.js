const rateLimit = require('express-rate-limit');

const json = (req, res) =>
  res.status(429).json({ error: 'Too many requests — please slow down and try again shortly.' });

// General API limiter: 300 requests / 15 min / IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

// Strict limiter for auth (brute-force protection): 12 attempts / 15 min / IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
  skipSuccessfulRequests: true, // only count failed logins/registrations
});

// Limiter for write-heavy actions (posting jobs, offers, support): 60 / 10 min / IP.
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
