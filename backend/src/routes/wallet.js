const express = require('express');
const crypto = require('crypto');
const { pool, query } = require('../db');
const { requireAuth } = require('../auth');
const { CREDIT_BUNDLES, BILLING_ENABLED, bundleById } = require('../constants');
const paynow = require('../paynow');

const router = express.Router();

const TOPUP_METHODS = ['web', 'ecocash', 'onemoney', 'innbucks'];

function shapeTopup(t) {
  return {
    id: t.id,
    reference: t.reference,
    bundleId: t.bundle_id,
    amountUsd: Number(t.amount_usd),
    credits: t.credits,
    method: t.method,
    status: t.status,
    credited: t.credited,
    createdAt: t.created_at,
  };
}

// Credit a paid top-up exactly once (row-locked, idempotent).
async function creditTopup(topupId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM paynow_topups WHERE id = $1 FOR UPDATE', [topupId]);
    const t = rows[0];
    if (!t) { await client.query('ROLLBACK'); return null; }
    if (t.credited) { await client.query('ROLLBACK'); return t; }
    const upd = await client.query(
      'UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2 RETURNING credit_balance',
      [t.credits, t.user_id]
    );
    const balanceAfter = upd.rows[0].credit_balance;
    await client.query(
      `INSERT INTO credit_ledger (user_id, delta, reason, balance_after, ref)
       VALUES ($1, $2, 'topup', $3, $4)`,
      [t.user_id, t.credits, balanceAfter, t.reference]
    );
    await client.query(
      "UPDATE paynow_topups SET credited = true, status = 'Paid', updated_at = now() WHERE id = $1",
      [topupId]
    );
    await client.query('COMMIT');
    return { ...t, credited: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// GET /api/wallet — balance, bundles, recent history, config flags.
router.get('/wallet', requireAuth, async (req, res, next) => {
  try {
    const bal = await query('SELECT credit_balance FROM users WHERE id = $1', [req.user.id]);
    const ledger = await query(
      `SELECT delta, reason, balance_after, ref, created_at
         FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    return res.json({
      balance: bal.rows[0] ? bal.rows[0].credit_balance : 0,
      bundles: CREDIT_BUNDLES,
      methods: TOPUP_METHODS,
      billingEnabled: BILLING_ENABLED,
      paynowConfigured: paynow.isConfigured(),
      ledger: ledger.rows.map((r) => ({
        delta: r.delta, reason: r.reason, balanceAfter: r.balance_after,
        ref: r.ref, createdAt: r.created_at,
      })),
    });
  } catch (err) { return next(err); }
});

// POST /api/wallet/topup — begin a Paynow top-up.
// body: { bundleId, method?, phone? }
router.post('/wallet/topup', requireAuth, async (req, res, next) => {
  try {
    if (!paynow.isConfigured()) {
      return res.status(503).json({ error: 'Payments are not configured yet. Please try again later.' });
    }
    const { bundleId, method = 'web', phone } = req.body || {};
    const bundle = bundleById(bundleId);
    if (!bundle) return res.status(400).json({ error: 'Unknown bundle.' });
    if (!TOPUP_METHODS.includes(method)) return res.status(400).json({ error: 'Unsupported payment method.' });
    const isMobile = method !== 'web';
    if (isMobile && !/^0\d{9}$/.test(String(phone || '').replace(/\s+/g, ''))) {
      return res.status(400).json({ error: 'Enter a valid mobile number, e.g. 0771234567.' });
    }

    const reference = `TL-${req.user.id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const amount = bundle.usd.toFixed(2);
    const c = paynow.config();
    const resulturl = `${c.resultUrl}?ref=${encodeURIComponent(reference)}`;
    const returnurl = `${c.returnUrl}?ref=${encodeURIComponent(reference)}`;

    // Persist the attempt first so the result callback can always find it.
    const ins = await query(
      `INSERT INTO paynow_topups (user_id, reference, bundle_id, amount_usd, credits, method, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Created') RETURNING *`,
      [req.user.id, reference, bundle.id, bundle.usd, bundle.credits, method]
    );
    const topup = ins.rows[0];

    const initParams = {
      reference, amount,
      additionalinfo: `TradeLink ${bundle.credits} credits (${bundle.label})`,
      returnurl, resulturl,
      authemail: req.user.email || 'noreply@tradelink.co.zw',
    };

    let result;
    if (isMobile) {
      result = await paynow.initiateExpress({ ...initParams, method, phone: String(phone).replace(/\s+/g, '') });
    } else {
      result = await paynow.initiateWeb(initParams);
    }

    if (!result.ok) {
      await query("UPDATE paynow_topups SET status = 'Failed', updated_at = now() WHERE id = $1", [topup.id]);
      return res.status(502).json({ error: result.error || 'Could not start payment.' });
    }

    await query('UPDATE paynow_topups SET poll_url = $1, status = $2, updated_at = now() WHERE id = $3',
      [result.pollurl, 'Sent', topup.id]);

    return res.status(201).json({
      topup: shapeTopup({ ...topup, poll_url: result.pollurl, status: 'Sent' }),
      browserurl: result.browserurl || null,           // web: redirect the customer here
      instructions: result.instructions || null,       // mobile: on-screen instructions
      authorizationcode: result.authorizationcode || null, // innbucks
    });
  } catch (err) { return next(err); }
});

// GET /api/wallet/topup/:id — poll Paynow and credit on success.
router.get('/wallet/topup/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM paynow_topups WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]);
    const t = rows[0];
    if (!t) return res.status(404).json({ error: 'Top-up not found.' });

    if (!t.credited && t.poll_url) {
      const status = await paynow.poll(t.poll_url);
      if (status.ok) {
        if (status.paid) {
          await creditTopup(t.id);
        } else {
          await query('UPDATE paynow_topups SET status = $1, updated_at = now() WHERE id = $2',
            [status.status || t.status, t.id]);
        }
      }
    }

    const fresh = await query('SELECT * FROM paynow_topups WHERE id = $1', [t.id]);
    const bal = await query('SELECT credit_balance FROM users WHERE id = $1', [req.user.id]);
    return res.json({
      topup: shapeTopup(fresh.rows[0]),
      balance: bal.rows[0].credit_balance,
    });
  } catch (err) { return next(err); }
});

// POST /api/paynow/result — server-to-server callback from Paynow (public).
router.post('/paynow/result', async (req, res, next) => {
  try {
    // Paynow posts either form-encoded fields or we can re-poll to be safe.
    const ref = (req.query.ref || (req.body && req.body.reference) || '').toString();
    if (!ref) return res.status(200).send('OK'); // acknowledge regardless
    const { rows } = await query('SELECT * FROM paynow_topups WHERE reference = $1', [ref]);
    const t = rows[0];
    if (t && !t.credited && t.poll_url) {
      const status = await paynow.poll(t.poll_url);
      if (status.ok && status.paid) {
        await creditTopup(t.id);
      } else if (status.ok) {
        await query('UPDATE paynow_topups SET status = $1, updated_at = now() WHERE id = $2',
          [status.status || t.status, t.id]);
      }
    }
    return res.status(200).send('OK');
  } catch (err) { return next(err); }
});

module.exports = { router, creditTopup };
