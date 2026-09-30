const rateLimit = require('express-rate-limit');

const json = (req, res) =>
  res.status(429).json({ error: 'Too many requests — please slow down and try again shortly.' });

const num = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

// Optional bypass used ONLY for load/stress testing. When LOADTEST_SECRET is set,
// requests carrying a matching `x-loadtest-secret` header skip rate limiting.
// It bypasses ONLY the rate limiter — never authentication. Leave unset in normal
// production so the limiter always applies.
const LOADTEST_SECRET = process.env.LOADTEST_SECRET || null;
const skip = (req) => !!LOADTEST_SECRET && req.headers['x-loadtest-secret'] === LOADTEST_SECRET;

// express-rate-limit's env validations assume a single long-lived process; on
// serverless (per-invocation instances behind Vercel's proxy) they only add noise.
const common = { standardHeaders: true, legacyHeaders: false, handler: json, skip, validate: false };

// General API limiter — default 300 requests / 15 min / IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.API_RATE_MAX, 300),
  ...common,
});

// Strict auth limiter (brute-force protection) — default 12 FAILED attempts / 15 min / IP.
// Successful logins are never counted, so real users are never blocked.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.AUTH_RATE_MAX, 12),
  skipSuccessfulRequests: true,
  ...common,
});

// Write-heavy actions (posting jobs, offers, support) — default 60 / 10 min / IP.
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: num(process.env.WRITE_RATE_MAX, 60),
  ...common,
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
