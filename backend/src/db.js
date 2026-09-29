const { Pool } = require('pg');

// Build a connection config. Prefer DATABASE_URL (Render / production),
// fall back to discrete PG* vars for local development.
function buildConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const cfg = { connectionString: url };
    // Managed Postgres (Supabase/Render) requires SSL. Allow disabling via PGSSL=disable for local URLs.
    if (process.env.PGSSL !== 'disable' && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('/tmp')) {
      cfg.ssl = { rejectUnauthorized: false };
    }
    // On serverless (Vercel) each invocation is its own instance — keep a tiny
    // pool per lambda and drop idle connections quickly so we don't exhaust the
    // Supabase connection pooler under concurrency.
    if (process.env.VERCEL) {
      cfg.max = 1;
      cfg.idleTimeoutMillis = 10000;
      cfg.connectionTimeoutMillis = 10000;
    }
    return cfg;
  }
  return {
    host: process.env.PGHOST || '/tmp',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || 'trustade',
  };
}

const pool = new Pool(buildConfig());

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
