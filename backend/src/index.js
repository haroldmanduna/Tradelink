require('dotenv').config();

const app = require('./app');
const migrate = require('./migrate');
const seedAdmin = require('./seedAdmin');

const PORT = parseInt(process.env.PORT || '3000', 10);

// Keep a long-running host (e.g. Render free tier) warm so it doesn't spin down
// from inactivity. Not used on serverless platforms like Vercel, where this
// file's start() is never invoked.
function setupKeepAlive() {
  const base = process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEPALIVE === 'off' || typeof fetch !== 'function') return;
  const INTERVAL_MS = 14 * 60 * 1000;
  const m = (process.env.KEEPALIVE_HOURS || '').match(/^(\d{1,2})-(\d{1,2})$/);
  const start = m ? +m[1] : null;
  const end = m ? +m[2] : null;
  const inWindow = () => {
    if (start === null) return true;
    const h = (new Date().getUTCHours() + 2) % 24; // CAT = UTC+2
    return start <= end ? (h >= start && h < end) : (h >= start || h < end);
  };
  const url = base.replace(/\/$/, '') + '/api/health';
  setInterval(() => {
    if (!inWindow()) return;
    fetch(url).then(() => {}).catch(() => {});
  }, INTERVAL_MS);
  console.log(`Keep-alive enabled -> ${url} ${m ? `(CAT ${start}-${end})` : '(24/7)'}`);
}

async function start() {
  try {
    if (process.env.SKIP_MIGRATE !== '1') {
      await migrate();
      await seedAdmin();
    }
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Trustade API listening on 0.0.0.0:${PORT}`);
      setupKeepAlive();
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
