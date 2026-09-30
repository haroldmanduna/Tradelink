const bcrypt = require('./hash');
const { query } = require('./db');

// Ensures exactly one superadmin exists, driven by environment variables.
// Idempotent: safe to run on every boot.
//   SUPERADMIN_EMAIL     (required to seed)
//   SUPERADMIN_PASSWORD  (required to seed on first creation)
//   SUPERADMIN_NAME      (optional, default "Administrator")
//   SUPERADMIN_PHONE     (optional)
// If a superadmin already exists, we leave the password untouched (so the
// owner can change it in-app without it being reset on redeploy).
async function seedAdmin() {
  const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || '';
  const name = (process.env.SUPERADMIN_NAME || 'Administrator').trim();
  const phone = (process.env.SUPERADMIN_PHONE || '').trim() || null;
  const location = (process.env.SUPERADMIN_LOCATION || 'Bulawayo').trim();

  if (!email) return; // nothing to seed

  const existing = await query('SELECT id FROM users WHERE is_superadmin = true LIMIT 1');
  if (existing.rows[0]) {
    // Superadmin already present — make sure the email on file matches env,
    // but never overwrite the password (owner may have changed it).
    await query('UPDATE users SET email = $1, name = $2 WHERE id = $3',
      [email, name, existing.rows[0].id]).catch(() => {});
    console.log('Superadmin present (id=%s).', existing.rows[0].id);
    return;
  }

  if (!password) {
    console.warn('SUPERADMIN_EMAIL set but SUPERADMIN_PASSWORD missing — skipping seed.');
    return;
  }

  // If a normal user already has this email/phone, promote them instead.
  const dup = await query(
    'SELECT id FROM users WHERE email = $1 OR (phone IS NOT NULL AND phone = $2) LIMIT 1',
    [email, phone]
  );
  const hash = await bcrypt.hash(password, 10);
  if (dup.rows[0]) {
    await query(
      "UPDATE users SET role='admin', is_superadmin=true, password_hash=$2, name=$3 WHERE id=$1",
      [dup.rows[0].id, hash, name]
    );
    console.log('Promoted existing user %s to superadmin.', dup.rows[0].id);
    return;
  }

  const ins = await query(
    `INSERT INTO users (role, name, email, phone, password_hash, location, is_superadmin)
     VALUES ('admin', $1, $2, $3, $4, $5, true) RETURNING id`,
    [name, email, phone, hash, location]
  );
  console.log('Created superadmin (id=%s, email=%s).', ins.rows[0].id, email);
}

module.exports = seedAdmin;

// Allow running standalone: `node src/seedAdmin.js`
if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
