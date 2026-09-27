const express = require('express');
const { pool, query } = require('../db');
const { requireAuth, requireRole, notSuspended } = require('../auth');
const { notifyOfferMade, notifyOfferAccepted } = require('../notify');

const router = express.Router();

// POST /api/jobs/:id/offers  (tradesperson) — send an offer or accept the budget.
// If price is omitted, it defaults to the job budget (i.e. "accept budget").
router.post('/jobs/:id/offers', requireAuth, notSuspended, requireRole('tradesperson'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const jobId = parseInt(req.params.id, 10);
    let { price, message } = req.body || {};

    await client.query('BEGIN');
    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [jobId]);
    const job = jobRes.rows[0];
    if (!job) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found.' });
    }
    if (job.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This job is no longer open for offers.' });
    }

    // Tradesperson category must match the job category.
    const profRes = await client.query(
      'SELECT category FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const prof = profRes.rows[0];
    if (!prof) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tradesperson profile missing.' });
    }
    // Category must match — except "other" jobs, which any tradesperson may bid on.
    if (prof.category !== job.category && job.category !== 'other') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: `You can only bid on ${prof.category} jobs.` });
    }

    // Default price to budget (accept budget).
    let priceNum = price === undefined || price === null || price === '' ? Number(job.budget) : Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'price must be a non-negative number.' });
    }

    // Upsert: allow updating an existing pending offer.
    const existing = await client.query(
      'SELECT * FROM offers WHERE job_id = $1 AND tradesperson_id = $2',
      [jobId, req.user.id]
    );
    let offer;
    if (existing.rows[0]) {
      if (existing.rows[0].status === 'accepted') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Your offer was already accepted.' });
      }
      const upd = await client.query(
        `UPDATE offers SET price = $1, message = $2, status = 'pending', created_at = now()
           WHERE id = $3 RETURNING *`,
        [priceNum, message || null, existing.rows[0].id]
      );
      offer = upd.rows[0];
    } else {
      const ins = await client.query(
        `INSERT INTO offers (job_id, tradesperson_id, price, message)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [jobId, req.user.id, priceNum, message || null]
      );
      offer = ins.rows[0];
    }
    await client.query('COMMIT');
    // Tell the customer they have a new offer (in-app + push).
    notifyOfferMade(job.customer_id, job).catch(() => {});
    return res.status(201).json({
      offer: { ...offer, price: Number(offer.price) },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// POST /api/offers/:id/accept  (customer) — accept an offer.
// Job -> matched, chosen offer -> accepted, other offers -> rejected.
router.post('/offers/:id/accept', requireAuth, notSuspended, requireRole('customer'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const offerId = parseInt(req.params.id, 10);
    await client.query('BEGIN');

    const offRes = await client.query('SELECT * FROM offers WHERE id = $1 FOR UPDATE', [offerId]);
    const offer = offRes.rows[0];
    if (!offer) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Offer not found.' });
    }

    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [offer.job_id]);
    const job = jobRes.rows[0];
    if (job.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This is not your job.' });
    }
    if (job.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'An offer has already been accepted for this job.' });
    }

    await client.query(`UPDATE offers SET status = 'accepted' WHERE id = $1`, [offerId]);
    await client.query(
      `UPDATE offers SET status = 'rejected' WHERE job_id = $1 AND id <> $2 AND status = 'pending'`,
      [offer.job_id, offerId]
    );
    const updJob = await client.query(
      `UPDATE jobs SET status = 'matched', accepted_offer_id = $1, updated_at = now()
         WHERE id = $2 RETURNING *`,
      [offerId, offer.job_id]
    );
    await client.query('COMMIT');
    // Tell the winning tradesperson their offer was accepted (in-app + push).
    notifyOfferAccepted(offer.tradesperson_id, updJob.rows[0]).catch(() => {});
    return res.json({
      job: { ...updJob.rows[0], budget: Number(updJob.rows[0].budget) },
      accepted_offer_id: offerId,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// POST /api/offers/:id/withdraw (tradesperson) — retract a pending offer.
router.post('/offers/:id/withdraw', requireAuth, requireRole('tradesperson'), async (req, res, next) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    const { rows } = await query('SELECT * FROM offers WHERE id = $1', [offerId]);
    const offer = rows[0];
    if (!offer) return res.status(404).json({ error: 'Offer not found.' });
    if (offer.tradesperson_id !== req.user.id) {
      return res.status(403).json({ error: 'This is not your offer.' });
    }
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Cannot withdraw a "${offer.status}" offer.` });
    }
    await query(`UPDATE offers SET status = 'withdrawn' WHERE id = $1`, [offerId]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// GET /api/offers/mine — tradesperson: all offers I've made
router.get('/offers/mine', requireAuth, requireRole('tradesperson'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.*, j.description, j.category, j.custom_category, j.status AS job_status, j.location, j.budget
         FROM offers o JOIN jobs j ON j.id = o.job_id
        WHERE o.tradesperson_id = $1
        ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    return res.json({
      offers: rows.map((o) => ({ ...o, price: Number(o.price), budget: Number(o.budget) })),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router };
