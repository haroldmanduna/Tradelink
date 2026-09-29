require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { CATEGORIES } = require('./constants');
const { router: authRouter } = require('./routes/auth');
const { router: jobsRouter } = require('./routes/jobs');
const { router: offersRouter } = require('./routes/offers');
const { router: ratingsRouter } = require('./routes/ratings');
const { router: miscRouter } = require('./routes/misc');
const { router: walletRouter } = require('./routes/wallet');
const { router: adminRouter } = require('./routes/admin');
const { router: notificationsRouter } = require('./routes/notifications');
const { apiLimiter, authLimiter, writeLimiter } = require('./ratelimit');

const app = express();
// Behind a proxy (Vercel / Render) — needed so rate-limiting keys on the real client IP.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// --- Rate limiting ---
app.use('/api', apiLimiter);          // general cap on all API traffic
app.use('/api/auth', authLimiter);    // stricter cap on auth endpoints
app.use('/api/support', writeLimiter);

// --- API routes ---
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'trustade', time: new Date().toISOString() }));
app.get('/api/meta/categories', (req, res) => res.json({ categories: CATEGORIES }));
// Public runtime config for the frontend (e.g. Google sign-in client id).
app.get('/api/meta/config', (req, res) => res.json({
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
}));

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api', offersRouter);   // /api/jobs/:id/offers, /api/offers/:id/accept, /api/offers/mine
app.use('/api', ratingsRouter);  // /api/jobs/:id/rating
app.use('/api', miscRouter);     // /api/profile, /api/stats, /api/support
app.use('/api', walletRouter);   // /api/wallet, /api/wallet/topup, /api/paynow/result
app.use('/api/admin', adminRouter);   // admin console: overview, users, jobs, reviews, complaints, actions
app.use('/api', notificationsRouter); // /api/notifications, /api/push/subscribe

// --- Serve frontend build when co-located (single-service / local production).
// On Vercel the static build is served by the CDN and this dir won't exist, so
// this block is skipped harmlessly. ---
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// --- 404 for unknown API routes ---
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// --- Central error handler ---
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
