const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

// PATCH /api/profile (tradesperson) — update skills / bio.
router.patch('/profile', requireAuth, requireRole('tradesperson'), async (req, res, next) => {
  try {
    const { skills, bio } = req.body || {};
    const { rows } = await query(
      `UPDATE tradesperson_profiles
          SET skills = $1, bio = $2
        WHERE user_id = $3
        RETURNING category, skills, bio, rating, rating_count, jobs_done, verified`,
      [skills != null ? String(skills).slice(0, 300) : null,
       bio != null ? String(bio).slice(0, 600) : null,
       req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Profile not found.' });
    const p = rows[0];
    return res.json({ profile: { ...p, rating: Number(p.rating) } });
  } catch (err) {
    return next(err);
  }
});

// GET /api/stats — lightweight dashboard counters for the logged-in user.
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'customer') {
      const { rows } = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open') AS open,
           COUNT(*) FILTER (WHERE status IN ('matched','in_progress')) AS active,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           (SELECT COUNT(*) FROM offers o JOIN jobs j2 ON j2.id = o.job_id
             WHERE j2.customer_id = $1) AS offers_received
         FROM jobs WHERE customer_id = $1`,
        [req.user.id]
      );
      const r = rows[0];
      return res.json({ stats: {
        open: +r.open, active: +r.active, completed: +r.completed, offers_received: +r.offers_received,
      }});
    }
    // tradesperson
    const prof = await query('SELECT category, rating, jobs_done FROM tradesperson_profiles WHERE user_id = $1', [req.user.id]);
    const category = prof.rows[0] ? prof.rows[0].category : null;
    const { rows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM jobs WHERE status = 'open' AND category = $2) AS available,
        (SELECT COUNT(*) FROM offers WHERE tradesperson_id = $1 AND status = 'pending') AS pending_offers,
        (SELECT COUNT(*) FROM offers o JOIN jobs j ON j.id = o.job_id
          WHERE o.tradesperson_id = $1 AND o.status = 'accepted' AND j.status IN ('matched','in_progress')) AS active,
        (SELECT COUNT(*) FROM offers o JOIN jobs j ON j.id = o.job_id
          WHERE o.tradesperson_id = $1 AND o.status = 'accepted' AND j.status = 'completed') AS completed`,
      [req.user.id, category]
    );
    const r = rows[0];
    return res.json({ stats: {
      available: +r.available, pending_offers: +r.pending_offers, active: +r.active, completed: +r.completed,
      rating: prof.rows[0] ? Number(prof.rows[0].rating) : 0,
    }});
  } catch (err) {
    return next(err);
  }
});

// POST /api/support — contact / support inbox (works logged-in or anonymously).
router.post('/support', async (req, res, next) => {
  try {
    let { name, email, subject, message } = req.body || {};
    name = (name || '').trim();
    email = (email || '').trim();
    subject = (subject || '').trim();
    message = (message || '').trim();
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    let userId = null;
    // optional auth: attach user if a valid token was sent
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../auth');
        userId = jwt.verify(header.slice(7), JWT_SECRET).id;
      } catch (_) { /* ignore invalid token */ }
    }
    await query(
      `INSERT INTO support_messages (user_id, name, email, subject, message)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, name.slice(0, 120), email.slice(0, 160), subject.slice(0, 160), message.slice(0, 4000)]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router };
