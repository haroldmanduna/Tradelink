const express = require('express');
const crypto = require('crypto');
const bcrypt = require('../hash');
const { OAuth2Client } = require('google-auth-library');
const { pool, query } = require('../db');
const { signToken, requireAuth } = require('../auth');
const { CATEGORIES } = require('../constants');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Assemble a public user object (+ profile for tradespeople).
async function loadFullUser(userId) {
  const { rows } = await query(
    `SELECT u.id, u.role, u.name, u.email, u.phone, u.location, u.created_at,
            u.is_superadmin, u.suspended,
            p.category, p.skills, p.bio, p.rating, p.rating_count, p.jobs_done, p.verified
       FROM users u
       LEFT JOIN tradesperson_profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  const user = {
    id: r.id,
    role: r.role,
    name: r.name,
    email: r.email,
    phone: r.phone,
    location: r.location,
    created_at: r.created_at,
    is_superadmin: r.is_superadmin || false,
    suspended: r.suspended || false,
  };
  if (r.role === 'tradesperson') {
    user.profile = {
      category: r.category,
      skills: r.skills,
      bio: r.bio,
      rating: r.rating != null ? Number(r.rating) : 0,
      rating_count: r.rating_count || 0,
      jobs_done: r.jobs_done || 0,
      verified: r.verified || false,
    };
  }
  return user;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { role, name, email, phone, password, location, category, skills, bio } = req.body || {};

    if (!['customer', 'tradesperson'].includes(role)) {
      return res.status(400).json({ error: 'role must be "customer" or "tradesperson".' });
    }
    name = (name || '').trim();
    location = (location || '').trim();
    email = email ? String(email).trim().toLowerCase() : null;
    phone = phone ? String(phone).trim() : null;

    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!location) return res.status(400).json({ error: 'Location is required.' });
    // Phone is REQUIRED: it's how the two parties contact each other once matched.
    if (!phone) return res.status(400).json({ error: 'A phone number is required so you can be contacted once matched.' });
    if (phone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ error: 'Enter a valid phone number, e.g. 0771234567.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (role === 'tradesperson') {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}.` });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    const dup = await client.query(
      'SELECT 1 FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
      [email, phone]
    );
    if (dup.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }

    const ins = await client.query(
      `INSERT INTO users (role, name, email, phone, password_hash, location)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [role, name, email, phone, password_hash, location]
    );
    const userId = ins.rows[0].id;

    if (role === 'tradesperson') {
      await client.query(
        `INSERT INTO tradesperson_profiles (user_id, category, skills, bio)
         VALUES ($1,$2,$3,$4)`,
        [userId, category, skills || null, bio || null]
      );
    }
    await client.query('COMMIT');

    const user = await loadFullUser(userId);
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// POST /api/auth/login  { identifier (email or phone), password }
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier and password are required.' });
    }
    const id = String(identifier).trim();
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 OR phone = $2 LIMIT 1',
      [id.toLowerCase(), id]
    );
    const found = rows[0];
    if (!found) return res.status(401).json({ error: 'Invalid credentials.' });

    const ok = await bcrypt.compare(password, found.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    if (found.suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const user = await loadFullUser(found.id);
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/google  { credential, role?, category? }
// Verifies the Google ID token, then finds-or-creates a user in OUR users table
// and issues OUR JWT — so admin/roles/suspension all keep working.
router.post('/google', async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!googleClient) {
      return res.status(503).json({ error: 'Google sign-in is not configured yet.' });
    }
    const { credential, role: wantRole, category: wantCategory } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

    // Verify the ID token signature + audience against our client id.
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch (_) {
      return res.status(401).json({ error: 'Could not verify your Google sign-in. Please try again.' });
    }
    if (!payload || !payload.email) return res.status(401).json({ error: 'Google account has no email.' });
    if (payload.email_verified === false) return res.status(401).json({ error: 'Your Google email is not verified.' });

    const email = String(payload.email).trim().toLowerCase();
    const googleId = payload.sub;
    const name = (payload.name || email.split('@')[0]).trim();

    // Existing account? Match by google_id first, then email.
    const found = await client.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [googleId, email]
    );

    if (found.rows[0]) {
      const u = found.rows[0];
      if (u.suspended) return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      // Link the google_id on first Google login for a password account.
      if (!u.google_id) await client.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, u.id]);
      const user = await loadFullUser(u.id);
      return res.json({ token: signToken(user), user });
    }

    // New account. Default to customer; allow tradesperson if requested.
    const role = wantRole === 'tradesperson' ? 'tradesperson' : 'customer';
    const category = CATEGORIES.includes(wantCategory) ? wantCategory : 'other';
    // Google accounts have no password — store an unusable random hash.
    const password_hash = await bcrypt.hash('google:' + crypto.randomBytes(24).toString('hex'), 10);

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO users (role, name, email, google_id, password_hash, location)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [role, name, email, googleId, password_hash, 'Bulawayo']
    );
    const userId = ins.rows[0].id;
    if (role === 'tradesperson') {
      await client.query(
        'INSERT INTO tradesperson_profiles (user_id, category) VALUES ($1,$2)',
        [userId, category]
      );
    }
    await client.query('COMMIT');

    const user = await loadFullUser(userId);
    return res.status(201).json({ token: signToken(user), user, isNew: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await loadFullUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // Suspended users are signed out on their next app load.
    if (user.suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router, loadFullUser };
