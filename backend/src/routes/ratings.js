const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

// POST /api/jobs/:id/rating  (customer) — rate the tradesperson after completion.
router.post('/jobs/:id/rating', requireAuth, requireRole('customer'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const jobId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body || {};
    const ratingNum = parseInt(rating, 10);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be an integer from 1 to 5.' });
    }

    await client.query('BEGIN');
    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [jobId]);
    const job = jobRes.rows[0];
    if (!job) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found.' });
    }
    if (job.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This is not your job.' });
    }
    if (job.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You can only rate a completed job.' });
    }
    if (!job.accepted_offer_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This job has no accepted tradesperson.' });
    }

    const existing = await client.query('SELECT 1 FROM ratings WHERE job_id = $1', [jobId]);
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You have already rated this job.' });
    }

    // Who is the tradesperson? via accepted offer.
    const offRes = await client.query('SELECT tradesperson_id FROM offers WHERE id = $1', [job.accepted_offer_id]);
    const tradespersonId = offRes.rows[0].tradesperson_id;

    await client.query(
      `INSERT INTO ratings (job_id, customer_id, tradesperson_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5)`,
      [jobId, req.user.id, tradespersonId, ratingNum, comment || null]
    );

    // Recompute the tradesperson's average rating + counts.
    await client.query(
      `UPDATE tradesperson_profiles p
          SET rating = sub.avg_rating,
              rating_count = sub.cnt
         FROM (
           SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
             FROM ratings WHERE tradesperson_id = $1
         ) sub
        WHERE p.user_id = $1`,
      [tradespersonId]
    );
    await client.query(
      `UPDATE tradesperson_profiles SET jobs_done = jobs_done + 1 WHERE user_id = $1`,
      [tradespersonId]
    );

    await client.query('COMMIT');
    return res.status(201).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = { router };
