require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const migrate = require('./migrate');
const seedAdmin = require('./seedAdmin');
const { pool } = require('./db');
const { CATEGORIES } = require('./constants');
const { router: authRouter } = require('./routes/auth');
const { router: jobsRouter } = require('./routes/jobs');
const { router: offersRouter } = require('./routes/offers');
const { router: ratingsRouter } = require('./routes/ratings');
const { router: miscRouter } = require('./routes/misc');
const { router: walletRouter } = require('./routes/wallet');
const { router: adminRouter } = require('./routes/admin');
const { apiLimiter, authLimiter, writeLimiter } = require('./ratelimit');

const app = express();
// Behind Render's proxy — needed so rate-limiting keys on the real client IP.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// --- Rate limiting ---
app.use('/api', apiLimiter);          // general cap on all API traffic
app.use('/api/auth', authLimiter);    // stricter cap on auth endpoints
app.use('/api/support', writeLimiter);

// --- API routes ---
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'tradelink', time: new Date().toISOString() }));
app.get('/api/meta/categories', (req, res) => res.json({ categories: CATEGORIES }));

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api', offersRouter);   // /api/jobs/:id/offers, /api/offers/:id/accept, /api/offers/mine
app.use('/api', ratingsRouter);  // /api/jobs/:id/rating
app.use('/api', miscRouter);     // /api/profile, /api/stats, /api/support
app.use('/api', walletRouter);   // /api/wallet, /api/wallet/topup, /api/paynow/result
app.use('/api/admin', adminRouter);   // admin console: overview, users, jobs, reviews, complaints, actions

// --- Serve frontend build in production (single-service deploy) ---
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

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    if (process.env.SKIP_MIGRATE !== '1') {
      await migrate();
      await seedAdmin();
    }
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`TradeLink API listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
