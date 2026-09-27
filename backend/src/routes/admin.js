const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../db');
const { requireAuth, requireAdmin, requireSuperadmin } = require('../auth');

const router = express.Router();

// Every route here requires a logged-in admin. Superadmin-only routes add
// requireSuperadmin on top.
router.use(requireAuth, requireAdmin);

// Record a privileged action to the immutable audit log.
async function logAction(admin, action, targetType, targetId, targetName, detail) {
  try {
    await query(
      `INSERT INTO admin_actions (admin_id, admin_name, action, target_type, target_id, target_name, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [admin.id, admin.name, action, targetType, targetId, targetName || null, detail || null]
    );
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

// GET /api/admin/overview — platform-wide counters for the dashboard header.
router.get('/overview', async (req, res, next) => {
  try {
    const [users, jobs, offers, ratings, support, topups] = await Promise.all([
      query(`SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE role='customer')::int AS customers,
                COUNT(*) FILTER (WHERE role='tradesperson')::int AS tradespeople,
                COUNT(*) FILTER (WHERE role='admin')::int AS admins,
                COUNT(*) FILTER (WHERE suspended)::int AS suspended
              FROM users`),
      query(`SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status='open')::int AS open,
                COUNT(*) FILTER (WHERE status IN ('matched','in_progress'))::int AS active,
                COUNT(*) FILTER (WHERE status='completed')::int AS completed,
                COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
                COALESCE(SUM(budget) FILTER (WHERE status='completed'),0)::float AS completed_value
              FROM jobs`),
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status='accepted')::int AS accepted
              FROM offers`),
      query(`SELECT COUNT(*)::int AS total, COALESCE(AVG(rating),0)::float AS avg
              FROM ratings`),
      query(`SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status='new')::int AS new,
                COUNT(*) FILTER (WHERE status='open')::int AS open,
                COUNT(*) FILTER (WHERE status='resolved')::int AS resolved
              FROM support_messages`),
      query(`SELECT
                COUNT(*) FILTER (WHERE status='Paid')::int AS paid,
                COALESCE(SUM(amount_usd) FILTER (WHERE status='Paid'),0)::float AS revenue
              FROM paynow_topups`),
    ]);
    res.json({
      users: users.rows[0],
      jobs: jobs.rows[0],
      offers: offers.rows[0],
      ratings: ratings.rows[0],
      support: support.rows[0],
      topups: topups.rows[0],
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users?search=&role=&status= — full directory of accounts.
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const where = [];
    const params = [];
    // Regular admins must NOT see admin accounts (or each other). Only the
    // superadmin can see admins.
    if (!req.admin.is_superadmin) where.push("u.role <> 'admin'");
    if (role && ['customer', 'tradesperson', 'admin'].includes(role)) {
      params.push(role); where.push(`u.role = $${params.length}`);
    }
    if (status === 'suspended') where.push('u.suspended = true');
    if (status === 'active') where.push('u.suspended = false');
    if (search && String(search).trim()) {
      params.push('%' + String(search).trim().toLowerCase() + '%');
      where.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(COALESCE(u.email,'')) LIKE $${params.length} OR COALESCE(u.phone,'') LIKE $${params.length})`);
    }
    const sql = `
      SELECT u.id, u.role, u.name, u.email, u.phone, u.location, u.created_at,
             u.is_superadmin, u.suspended, u.suspended_reason, u.credit_balance,
             p.category, p.rating, p.rating_count, p.jobs_done, p.verified,
             (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = u.id)::int AS jobs_posted,
             (SELECT COUNT(*) FROM offers o WHERE o.tradesperson_id = u.id)::int AS offers_made
        FROM users u
        LEFT JOIN tradesperson_profiles p ON p.user_id = u.id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY u.created_at DESC
        LIMIT 500`;
    const { rows } = await query(sql, params);
    res.json({ users: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/jobs — every job with the people attached.
router.get('/jobs', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let filter = '';
    if (status && status !== 'all') { params.push(status); filter = `WHERE j.status = $${params.length}`; }
    const { rows } = await query(`
      SELECT j.id, j.category, j.custom_category, j.description, j.location, j.budget,
             j.status, j.created_at,
             c.name AS customer_name, c.id AS customer_id,
             tp.name AS pro_name, tp.id AS pro_id,
             (SELECT COUNT(*) FROM offers o WHERE o.job_id = j.id)::int AS offer_count
        FROM jobs j
        JOIN users c ON c.id = j.customer_id
        LEFT JOIN offers ao ON ao.id = j.accepted_offer_id
        LEFT JOIN users tp ON tp.id = ao.tradesperson_id
        ${filter}
        ORDER BY j.created_at DESC
        LIMIT 500`, params);
    res.json({ jobs: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/reviews — every rating & comment left on the platform.
router.get('/reviews', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT r.id, r.rating, r.comment, r.created_at, r.job_id,
             c.name AS customer_name, c.id AS customer_id,
             t.name AS pro_name, t.id AS pro_id,
             j.category, j.custom_category
        FROM ratings r
        JOIN users c ON c.id = r.customer_id
        JOIN users t ON t.id = r.tradesperson_id
        JOIN jobs j ON j.id = r.job_id
        ORDER BY r.created_at DESC
        LIMIT 500`);
    res.json({ reviews: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/complaints — the support / complaints inbox.
router.get('/complaints', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let filter = '';
    if (status && status !== 'all') { params.push(status); filter = `WHERE s.status = $${params.length}`; }
    const { rows } = await query(`
      SELECT s.id, s.name, s.email, s.subject, s.message, s.status, s.created_at,
             s.user_id, u.role AS user_role
        FROM support_messages s
        LEFT JOIN users u ON u.id = s.user_id
        ${filter}
        ORDER BY (s.status='new') DESC, s.created_at DESC
        LIMIT 500`, params);
    res.json({ complaints: rows });
  } catch (err) { next(err); }
});

// PATCH /api/admin/complaints/:id { status } — triage a support message.
router.patch('/complaints/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'open', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'status must be new, open or resolved.' });
    }
    const { rows } = await query(
      'UPDATE support_messages SET status = $1 WHERE id = $2 RETURNING id, subject',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Message not found.' });
    await logAction(req.admin, 'support_status', 'support', rows[0].id, rows[0].subject, `→ ${status}`);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/admins — CREATE a brand-new admin account (superadmin only).
// The new admin logs in with the email/phone + password set here.
router.post('/admins', requireSuperadmin, async (req, res, next) => {
  try {
    let { name, email, phone, password } = req.body || {};
    name = (name || '').trim();
    email = email ? String(email).trim().toLowerCase() : null;
    phone = phone ? String(phone).trim() : null;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!email && !phone) return res.status(400).json({ error: 'An email or phone is required (it is their login).' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (phone && phone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ error: 'Enter a valid phone number.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const dup = await query(
      'SELECT 1 FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
      [email, phone]
    );
    if (dup.rowCount > 0) return res.status(409).json({ error: 'An account with that email or phone already exists.' });

    const hash = await bcrypt.hash(String(password), 10);
    const ins = await query(
      `INSERT INTO users (role, name, email, phone, password_hash, location, is_superadmin)
       VALUES ('admin', $1, $2, $3, $4, $5, false)
       RETURNING id, name, email, phone`,
      [name, email, phone, hash, 'Bulawayo']
    );
    await logAction(req.admin, 'grant_admin', 'user', ins.rows[0].id, name, 'created new admin account');
    return res.status(201).json({ admin: ins.rows[0] });
  } catch (err) { next(err); }
});

// GET /api/admin/actions — the audit log.
router.get('/actions', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 300'
    );
    res.json({ actions: rows });
  } catch (err) { next(err); }
});

// Helper: load a target user, guarding the superadmin.
async function loadTarget(id) {
  const { rows } = await query(
    'SELECT id, name, role, is_superadmin, suspended FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// POST /api/admin/users/:id/suspend { reason }
router.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.is_superadmin) return res.status(403).json({ error: 'The superadmin cannot be suspended.' });
    if (target.id === req.admin.id) return res.status(400).json({ error: 'You cannot suspend yourself.' });
    // Only the superadmin may act on other admins.
    if (target.role === 'admin' && !req.admin.is_superadmin) {
      return res.status(403).json({ error: 'Only the superadmin can suspend another admin.' });
    }
    const reason = (req.body && req.body.reason ? String(req.body.reason) : '').slice(0, 300) || null;
    await query(
      'UPDATE users SET suspended = true, suspended_at = now(), suspended_reason = $2 WHERE id = $1',
      [target.id, reason]
    );
    await logAction(req.admin, 'suspend', 'user', target.id, target.name, reason);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/unsuspend
router.post('/users/:id/unsuspend', async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'admin' && !req.admin.is_superadmin) {
      return res.status(403).json({ error: 'Only the superadmin can manage another admin.' });
    }
    await query(
      'UPDATE users SET suspended = false, suspended_at = NULL, suspended_reason = NULL WHERE id = $1',
      [target.id]
    );
    await logAction(req.admin, 'unsuspend', 'user', target.id, target.name, null);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/make-admin — superadmin only.
router.post('/users/:id/make-admin', requireSuperadmin, async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'admin') return res.status(400).json({ error: 'That user is already an admin.' });
    await query("UPDATE users SET role = 'admin' WHERE id = $1", [target.id]);
    await logAction(req.admin, 'grant_admin', 'user', target.id, target.name, `was ${target.role}`);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/revoke-admin { role } — superadmin only.
// Demotes an admin back to a normal account. The superadmin is protected.
router.post('/users/:id/revoke-admin', requireSuperadmin, async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.is_superadmin) return res.status(403).json({ error: 'The superadmin cannot be removed.' });
    if (target.role !== 'admin') return res.status(400).json({ error: 'That user is not an admin.' });
    const newRole = req.body && req.body.role === 'tradesperson' ? 'tradesperson' : 'customer';
    // A tradesperson needs a profile row; if missing, fall back to customer.
    if (newRole === 'tradesperson') {
      const p = await query('SELECT 1 FROM tradesperson_profiles WHERE user_id = $1', [target.id]);
      if (!p.rows[0]) {
        await query("UPDATE users SET role = 'customer' WHERE id = $1", [target.id]);
      } else {
        await query("UPDATE users SET role = 'tradesperson' WHERE id = $1", [target.id]);
      }
    } else {
      await query("UPDATE users SET role = 'customer' WHERE id = $1", [target.id]);
    }
    await logAction(req.admin, 'revoke_admin', 'user', target.id, target.name, null);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/change-password { current, next } — change own admin password.
router.post('/change-password', async (req, res, next) => {
  try {
    const { current, next: newPass } = req.body || {};
    if (!current || !newPass) return res.status(400).json({ error: 'Both current and new passwords are required.' });
    if (String(newPass).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.admin.id]);
    const ok = await bcrypt.compare(current, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(String(newPass), 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.admin.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = { router };
