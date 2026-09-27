const express = require('express');
const { pool, query } = require('../db');
const { requireAuth, requireRole, notSuspended } = require('../auth');
const { CATEGORIES, JOB_TRANSITIONS } = require('../constants');

const router = express.Router();

// Helper: shape a job row with offer count.
function shapeJob(r) {
  return {
    id: r.id,
    customer_id: r.customer_id,
    customer_name: r.customer_name,
    category: r.category,
    custom_category: r.custom_category || null,
    description: r.description,
    location: r.location,
    budget: Number(r.budget),
    status: r.status,
    accepted_offer_id: r.accepted_offer_id,
    worker_marked_done: r.worker_marked_done || false,
    worker_done_at: r.worker_done_at || null,
    completion_note: r.completion_note || null,
    offer_count: r.offer_count != null ? Number(r.offer_count) : undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// POST /api/jobs  (customer) — post a job
router.post('/', requireAuth, notSuspended, requireRole('customer'), async (req, res, next) => {
  try {
    let { category, custom_category, description, location, budget } = req.body || {};
    description = (description || '').trim();
    location = (location || '').trim();
    custom_category = (custom_category || '').trim().slice(0, 60);
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}.` });
    }
    if (category === 'other' && !custom_category) {
      return res.status(400).json({ error: 'Please describe the type of tradesperson you need.' });
    }
    if (!description) return res.status(400).json({ error: 'Description is required.' });
    if (!location) return res.status(400).json({ error: 'Location is required.' });
    const budgetNum = Number(budget);
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      return res.status(400).json({ error: 'budget must be a non-negative number.' });
    }

    const { rows } = await query(
      `INSERT INTO jobs (customer_id, category, custom_category, description, location, budget)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, category, category === 'other' ? custom_category : null, description, location, budgetNum]
    );
    return res.status(201).json({ job: shapeJob(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

// GET /api/jobs  — browse open jobs (tradesperson). Filters: category, location.
// Tradespeople default to their own category; excludes jobs they already offered on? No — include but flag.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const params = [];
    const where = [];

    // Default view = open jobs.
    where.push(`j.status = $${params.push(status || 'open')}`);
    if (category) {
      where.push(`j.category = $${params.push(category)}`);
    }

    let myOfferJoin = '';
    if (req.user.role === 'tradesperson') {
      myOfferJoin = `LEFT JOIN offers mo ON mo.job_id = j.id AND mo.tradesperson_id = $${params.push(req.user.id)}`;
    }

    const sql = `
      SELECT j.*, u.name AS customer_name,
             (SELECT COUNT(*) FROM offers o WHERE o.job_id = j.id) AS offer_count
             ${req.user.role === 'tradesperson' ? ', mo.id AS my_offer_id, mo.price AS my_offer_price, mo.status AS my_offer_status' : ''}
        FROM jobs j
        JOIN users u ON u.id = j.customer_id
        ${myOfferJoin}
       WHERE ${where.join(' AND ')}
       ORDER BY j.created_at DESC`;

    const { rows } = await query(sql, params);
    const jobs = rows.map((r) => {
      const job = shapeJob(r);
      if (req.user.role === 'tradesperson' && r.my_offer_id) {
        job.my_offer = { id: r.my_offer_id, price: Number(r.my_offer_price), status: r.my_offer_status };
      }
      return job;
    });
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

// GET /api/jobs/mine — customer's own jobs
router.get('/mine', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT j.*, u.name AS customer_name,
              (SELECT COUNT(*) FROM offers o WHERE o.job_id = j.id) AS offer_count
         FROM jobs j JOIN users u ON u.id = j.customer_id
        WHERE j.customer_id = $1
        ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    return res.json({ jobs: rows.map(shapeJob) });
  } catch (err) {
    return next(err);
  }
});

// GET /api/jobs/assigned — tradesperson's accepted/assigned jobs
router.get('/assigned', requireAuth, requireRole('tradesperson'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT j.*, u.name AS customer_name, u.phone AS customer_phone,
              o.price AS agreed_price, o.id AS my_offer_id,
              r.rating AS my_rating, r.comment AS my_rating_comment
         FROM offers o
         JOIN jobs j ON j.id = o.job_id
         JOIN users u ON u.id = j.customer_id
         LEFT JOIN ratings r ON r.job_id = j.id
        WHERE o.tradesperson_id = $1 AND o.status = 'accepted'
        ORDER BY j.updated_at DESC`,
      [req.user.id]
    );
    const jobs = rows.map((r) => ({
      ...shapeJob(r),
      customer_phone: r.customer_phone,
      agreed_price: Number(r.agreed_price),
      my_offer_id: r.my_offer_id,
      rating: r.my_rating != null ? { rating: r.my_rating, comment: r.my_rating_comment } : null,
    }));
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

// GET /api/jobs/:id — details incl. offers (customer sees offers; owner or offerer allowed)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isInteger(jobId)) return res.status(400).json({ error: 'Invalid job id.' });

    const jobRes = await query(
      `SELECT j.*, u.name AS customer_name, u.phone AS customer_phone
         FROM jobs j JOIN users u ON u.id = j.customer_id WHERE j.id = $1`,
      [jobId]
    );
    if (!jobRes.rows[0]) return res.status(404).json({ error: 'Job not found.' });
    const job = jobRes.rows[0];

    const offersRes = await query(
      `SELECT o.*, u.name AS tradesperson_name, u.location AS tradesperson_location,
              u.phone AS tradesperson_phone,
              p.category, p.rating, p.rating_count, p.jobs_done, p.verified
         FROM offers o
         JOIN users u ON u.id = o.tradesperson_id
         LEFT JOIN tradesperson_profiles p ON p.user_id = o.tradesperson_id
        WHERE o.job_id = $1
        ORDER BY o.price ASC, o.created_at ASC`,
      [jobId]
    );

    const offers = offersRes.rows.map((o) => ({
      id: o.id,
      job_id: o.job_id,
      tradesperson_id: o.tradesperson_id,
      tradesperson_name: o.tradesperson_name,
      tradesperson_location: o.tradesperson_location,
      // Phone revealed only on the ACCEPTED offer (added below for the owner).
      category: o.category,
      rating: o.rating != null ? Number(o.rating) : 0,
      rating_count: o.rating_count || 0,
      jobs_done: o.jobs_done || 0,
      verified: o.verified || false,
      price: Number(o.price),
      message: o.message,
      status: o.status,
      created_at: o.created_at,
      _phone: o.tradesperson_phone, // internal, stripped before send unless accepted+owner
    }));

    const result = {
      ...shapeJob({ ...job, customer_name: job.customer_name }),
      customer_phone: job.customer_phone,
    };

    // Only the job owner can see the customer phone + full offer list detail.
    const isOwner = req.user.id === job.customer_id;
    if (isOwner) {
      // Owner: hide their own phone (not useful to them). Reveal the ACCEPTED
      // tradesperson's phone so they can make contact.
      delete result.customer_phone;
      result.offers = offers.map((o) => {
        const { _phone, ...rest } = o;
        return o.status === 'accepted' ? { ...rest, tradesperson_phone: _phone } : rest;
      });
    } else {
      // A tradesperson only sees their own offer on this job.
      const mine = offers.find((o) => o.tradesperson_id === req.user.id);
      result.offers = mine ? [(() => { const { _phone, ...rest } = mine; return rest; })()] : [];
      delete result.customer_phone; // hide until matched
      if (mine && mine.status === 'accepted') {
        result.customer_phone = job.customer_phone; // reveal customer's phone to matched pro
      }
    }
    return res.json({ job: result });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/jobs/:id/status — customer moves status forward
router.patch('/:id/status', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'This is not your job.' });
    }
    const allowed = JOB_TRANSITIONS[job.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot move job from "${job.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}.`,
      });
    }
    const { rows } = await query(
      `UPDATE jobs SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, jobId]
    );
    return res.json({ job: shapeJob({ ...rows[0], customer_name: undefined }) });
  } catch (err) {
    return next(err);
  }
});

// POST /api/jobs/:id/mark-done  (tradesperson) — the assigned worker marks the
// work finished and leaves a completion note. The customer then confirms + rates.
router.post('/:id/mark-done', requireAuth, requireRole('tradesperson'), async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const { note } = req.body || {};
    const jr = await query(
      `SELECT j.*, o.tradesperson_id AS worker_id
         FROM jobs j LEFT JOIN offers o ON o.id = j.accepted_offer_id
        WHERE j.id = $1`,
      [jobId]
    );
    const job = jr.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.worker_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the assigned tradesperson for this job.' });
    }
    if (!['matched', 'in_progress'].includes(job.status)) {
      return res.status(400).json({ error: `Cannot mark a "${job.status}" job as done.` });
    }
    const { rows } = await query(
      `UPDATE jobs
          SET worker_marked_done = true,
              worker_done_at = now(),
              completion_note = $1,
              status = CASE WHEN status = 'matched' THEN 'in_progress' ELSE status END,
              updated_at = now()
        WHERE id = $2 RETURNING *`,
      [note ? String(note).slice(0, 1000) : null, jobId]
    );
    return res.json({ job: shapeJob(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router };
