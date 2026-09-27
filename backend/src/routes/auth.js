const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../db');
const { signToken, requireAuth } = require('../auth');
const { CATEGORIES } = require('../constants');

const router = express.Router();

// Assemble a public user object (+ profile for tradespeople).
async function loadFullUser(userId) {
  const { rows } = await query(
    `SELECT u.id, u.role, u.name, u.email, u.phone, u.location, u.created_at,
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

    const user = await loadFullUser(found.id);
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await loadFullUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router, loadFullUser };
