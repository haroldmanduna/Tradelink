const { Pool } = require('pg');

// Build a connection config. Prefer DATABASE_URL (Render / production),
// fall back to discrete PG* vars for local development.
function buildConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const cfg = { connectionString: url };
    // Render managed Postgres requires SSL. Allow disabling via PGSSL=disable for local URLs.
    if (process.env.PGSSL !== 'disable' && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('/tmp')) {
      cfg.ssl = { rejectUnauthorized: false };
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
