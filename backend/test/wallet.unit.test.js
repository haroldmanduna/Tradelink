// Local unit test for wallet crediting logic + fee tiers.
// Runs directly against the local DB (not for prod). Usage: node test/wallet.unit.test.js
require('dotenv').config();
const { pool, query } = require('../src/db');
const { creditTopup } = require('../src/routes/wallet');
const { feeForPrice, FEE_BANDS } = require('../src/constants');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  \x1b[32m✔\x1b[0m ' + msg); }
  else { failed++; console.log('  \x1b[31m✘\x1b[0m ' + msg); }
}

async function run() {
  console.log('\n=== Wallet unit tests ===\n');

  // Fee tiers: disabled by default (launch free).
  process.env.BILLING_ENABLED; // documented flag
  const { BILLING_ENABLED } = require('../src/constants');
  if (!BILLING_ENABLED) {
    assert(feeForPrice(30) === 0 && feeForPrice(5000) === 0, 'billing disabled → fee is always 0 (free launch)');
  } else {
    assert(feeForPrice(30) === FEE_BANDS[0].credits, 'billing enabled → small job uses lowest band');
  }

  // Seed a throwaway user + topup, then credit it twice (idempotent).
  const u = await query(
    `INSERT INTO users (role, name, email, password_hash, location)
     VALUES ('tradesperson', 'Credit Test', $1, 'x', 'Bulawayo') RETURNING id`,
    [`credittest${Date.now()}@mail.com`]
  );
  const userId = u.rows[0].id;
  const ref = `TL-UNIT-${Date.now()}`;
  const t = await query(
    `INSERT INTO paynow_topups (user_id, reference, bundle_id, amount_usd, credits, method, status, poll_url)
     VALUES ($1,$2,'standard',5.00,55,'web','Sent','http://x') RETURNING id`,
    [userId, ref]
  );
  const topupId = t.rows[0].id;

  await creditTopup(topupId);
  let bal = (await query('SELECT credit_balance FROM users WHERE id=$1', [userId])).rows[0].credit_balance;
  assert(bal === 55, 'first credit adds bundle credits to balance');

  // Calling again must NOT double-credit.
  await creditTopup(topupId);
  bal = (await query('SELECT credit_balance FROM users WHERE id=$1', [userId])).rows[0].credit_balance;
  assert(bal === 55, 'second credit is idempotent (no double-credit)');

  const ledger = await query('SELECT * FROM credit_ledger WHERE user_id=$1', [userId]);
  assert(ledger.rows.length === 1 && ledger.rows[0].delta === 55 && ledger.rows[0].reason === 'topup',
    'ledger has exactly one topup entry');

  const flag = (await query('SELECT credited, status FROM paynow_topups WHERE id=$1', [topupId])).rows[0];
  assert(flag.credited === true && flag.status === 'Paid', 'topup marked credited + Paid');

  // Cleanup.
  await query('DELETE FROM users WHERE id=$1', [userId]);

  console.log('\n=== Results ===');
  console.log(`  PASSED: ${passed}\n  FAILED: ${failed}`);
  await pool.end();
  if (failed > 0) process.exit(1);
  console.log('\nAll wallet unit tests passed. \u2713');
}

run().catch((err) => { console.error('crashed:', err); process.exit(1); });
