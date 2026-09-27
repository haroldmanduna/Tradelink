const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /api/notifications — this user's recent notifications + unread count.
router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, type, title, body, job_id, read, created_at
         FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = rows.reduce((n, r) => n + (r.read ? 0 : 1), 0);
    res.json({ notifications: rows, unread });
  } catch (e) { next(e); }
});

// POST /api/notifications/read-all — mark everything read.
router.post('/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/notifications/:id/read — mark one read.
router.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/push/subscribe { subscription } — save a Web Push subscription.
router.post('/push/subscribe', requireAuth, async (req, res, next) => {
  try {
    const sub = req.body && req.body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription.' });
    }
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (endpoint)
         DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
    );
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/push/unsubscribe { endpoint }
router.post('/push/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const endpoint = req.body && req.body.endpoint;
    if (endpoint) await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { router };
