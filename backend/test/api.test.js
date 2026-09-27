// End-to-end API test for Trustade. Run against a live server.
// Usage: BASE=http://localhost:3000 node test/api.test.js
const BASE = process.env.BASE || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const fails = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  \x1b[32m✔\x1b[0m ' + msg);
  } else {
    failed++;
    fails.push(msg);
    console.log('  \x1b[31m✘\x1b[0m ' + msg);
  }
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}

const uniq = Date.now();

async function run() {
  console.log('\n=== Trustade API E2E tests ===\n');

  // Health
  let r = await api('GET', '/api/health');
  assert(r.status === 200 && r.data.ok, 'health check responds ok');

  r = await api('GET', '/api/meta/categories');
  assert(r.status === 200 && Array.isArray(r.data.categories) && r.data.categories.includes('electrician'),
    'categories list returned');

  console.log('\n-- Registration & auth --');
  // Register customer
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'Thandi Moyo', email: `thandi${uniq}@mail.com`,
    phone: `077${uniq}`.slice(0, 12), password: 'secret123', location: 'Bulawayo',
  }});
  assert(r.status === 201 && r.data.token, 'register customer returns token');
  const customer = r.data;

  // Register electrician
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Sipho Ncube', email: `sipho${uniq}@mail.com`,
    phone: `071${uniq}`.slice(0, 12),
    password: 'secret123', location: 'Bulawayo', category: 'electrician', skills: 'Wiring, solar',
  }});
  assert(r.status === 201 && r.data.user.profile.category === 'electrician', 'register electrician w/ profile');
  const elec1 = r.data;

  // Register a 2nd electrician
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Rudo Dube', email: `rudo${uniq}@mail.com`,
    phone: `072${uniq}`.slice(0, 12),
    password: 'secret123', location: 'Zvishavane', category: 'electrician',
  }});
  const elec2 = r.data;
  assert(r.status === 201, 'register 2nd electrician');

  // Register a plumber (should NOT see electrician jobs / cannot bid)
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Farai Sibanda', email: `farai${uniq}@mail.com`,
    phone: `073${uniq}`.slice(0, 12),
    password: 'secret123', location: 'Bulawayo', category: 'plumber',
  }});
  const plumber = r.data;
  assert(r.status === 201, 'register plumber');

  // Duplicate email rejected
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'Dup', email: `thandi${uniq}@mail.com`, phone: `075${uniq}`.slice(0, 12), password: 'secret123', location: 'Bulawayo',
  }});
  assert(r.status === 409, 'duplicate email rejected (409)');

  // Bad password rejected
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'Short', email: `x${uniq}@mail.com`, phone: `076${uniq}`.slice(0, 12), password: '123', location: 'Bulawayo',
  }});
  assert(r.status === 400, 'short password rejected (400)');

  // Phone is now required (it's how matched parties reach each other).
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'NoPhone', email: `np${uniq}@mail.com`, password: 'secret123', location: 'Harare',
  }});
  assert(r.status === 400, 'registration without a phone number rejected (400)');

  // Login
  r = await api('POST', '/api/auth/login', { body: { identifier: `sipho${uniq}@mail.com`, password: 'secret123' }});
  assert(r.status === 200 && r.data.token, 'login with email works');
  r = await api('POST', '/api/auth/login', { body: { identifier: `sipho${uniq}@mail.com`, password: 'wrong' }});
  assert(r.status === 401, 'wrong password rejected');

  // me
  r = await api('GET', '/api/auth/me', { token: customer.token });
  assert(r.status === 200 && r.data.user.role === 'customer', '/me returns current user');
  r = await api('GET', '/api/auth/me');
  assert(r.status === 401, '/me without token is 401');

  console.log('\n-- Posting jobs --');
  // Customer posts an electrician job
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'electrician', description: 'Install DB board and 6 plug points', location: 'Bulawayo, Hillside', budget: 120,
  }});
  assert(r.status === 201 && r.data.job.status === 'open', 'customer posts electrician job (open)');
  const job = r.data.job;

  // Tradesperson cannot post a job
  r = await api('POST', '/api/jobs', { token: elec1.token, body: {
    category: 'electrician', description: 'x', location: 'y', budget: 10 }});
  assert(r.status === 403, 'tradesperson cannot post a job (403)');

  // Invalid category
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'wizard', description: 'x', location: 'y', budget: 10 }});
  assert(r.status === 400, 'invalid category rejected (400)');

  console.log('\n-- Browsing --');
  // Electrician sees the open job
  r = await api('GET', '/api/jobs?category=electrician', { token: elec1.token });
  assert(r.status === 200 && r.data.jobs.some((j) => j.id === job.id), 'electrician sees open electrician job');

  // Plumber filtering to plumber sees none of this job
  r = await api('GET', '/api/jobs?category=plumber', { token: plumber.token });
  assert(r.status === 200 && !r.data.jobs.some((j) => j.id === job.id), 'plumber category filter excludes electrician job');

  console.log('\n-- Offers --');
  // Plumber cannot bid on electrician job
  r = await api('POST', `/api/jobs/${job.id}/offers`, { token: plumber.token, body: { price: 100 }});
  assert(r.status === 403, 'plumber cannot bid on electrician job (403)');

  // Elec1 sends counter-offer
  r = await api('POST', `/api/jobs/${job.id}/offers`, { token: elec1.token, body: { price: 150, message: 'Includes materials' }});
  assert(r.status === 201 && r.data.offer.price === 150, 'electrician 1 sends counter-offer 150');

  // Elec2 accepts the budget (no price)
  r = await api('POST', `/api/jobs/${job.id}/offers`, { token: elec2.token, body: { message: 'Can do at your budget' }});
  assert(r.status === 201 && r.data.offer.price === 120, 'electrician 2 accepts budget (price=120)');

  // Elec1 updates their offer (upsert)
  r = await api('POST', `/api/jobs/${job.id}/offers`, { token: elec1.token, body: { price: 130 }});
  assert(r.status === 201 && r.data.offer.price === 130, 'electrician 1 updates offer to 130 (upsert)');

  // Customer views offers on job
  r = await api('GET', `/api/jobs/${job.id}`, { token: customer.token });
  assert(r.status === 200 && r.data.job.offers.length === 2, 'customer sees 2 offers');
  assert(r.data.job.offers[0].price <= r.data.job.offers[1].price, 'offers sorted by price asc');

  // Tradesperson only sees own offer on job detail
  r = await api('GET', `/api/jobs/${job.id}`, { token: elec2.token });
  assert(r.status === 200 && r.data.job.offers.length === 1 && r.data.job.offers[0].tradesperson_id === elec2.user.id,
    'tradesperson sees only own offer');
  assert(r.data.job.customer_phone === undefined, 'customer phone hidden before match');

  console.log('\n-- Accept offer / status flow --');
  // Find elec2 offer id
  r = await api('GET', `/api/jobs/${job.id}`, { token: customer.token });
  const elec2Offer = r.data.job.offers.find((o) => o.tradesperson_id === elec2.user.id);
  const elec1Offer = r.data.job.offers.find((o) => o.tradesperson_id === elec1.user.id);

  // Another customer cannot accept
  r = await api('POST', `/api/offers/${elec2Offer.id}/accept`, { token: elec1.token });
  assert(r.status === 403, 'non-customer cannot accept offer');

  // Customer accepts elec2's offer
  r = await api('POST', `/api/offers/${elec2Offer.id}/accept`, { token: customer.token });
  assert(r.status === 200 && r.data.job.status === 'matched', 'customer accepts offer -> job matched');

  // Other offer got rejected
  r = await api('GET', `/api/jobs/${job.id}`, { token: customer.token });
  const rejected = r.data.job.offers.find((o) => o.id === elec1Offer.id);
  assert(rejected.status === 'rejected', 'losing offer auto-rejected');

  // Cannot accept twice / job not open
  r = await api('POST', `/api/offers/${elec1Offer.id}/accept`, { token: customer.token });
  assert(r.status === 400, 'cannot accept second offer after match');

  // New offers rejected because job not open
  r = await api('POST', `/api/jobs/${job.id}/offers`, { token: elec1.token, body: { price: 90 }});
  assert(r.status === 400, 'cannot bid on non-open job');

  // elec2 now sees the job in assigned + gets customer phone
  r = await api('GET', '/api/jobs/assigned', { token: elec2.token });
  assert(r.status === 200 && r.data.jobs.some((j) => j.id === job.id && j.agreed_price === 120),
    'winning tradesperson sees assigned job with agreed price');
  r = await api('GET', `/api/jobs/${job.id}`, { token: elec2.token });
  assert(r.data.job.customer_phone, 'winning tradesperson can see customer phone after match');

  // Customer (owner) sees the accepted tradesperson's phone — contact is mutual.
  r = await api('GET', `/api/jobs/${job.id}`, { token: customer.token });
  const accOffer = r.data.job.offers.find((o) => o.status === 'accepted');
  assert(accOffer && accOffer.tradesperson_phone, 'customer can see accepted tradesperson phone after match');
  assert(r.data.job.customer_phone === undefined, 'owner does not see their own phone in the contact box');
  const lostOffer = r.data.job.offers.find((o) => o.status === 'rejected');
  assert(!lostOffer || lostOffer.tradesperson_phone === undefined, 'non-accepted offers never leak a phone number');

  // Status: matched -> in_progress -> completed
  r = await api('PATCH', `/api/jobs/${job.id}/status`, { token: customer.token, body: { status: 'in_progress' }});
  assert(r.status === 200 && r.data.job.status === 'in_progress', 'customer marks in_progress');
  // invalid jump
  r = await api('PATCH', `/api/jobs/${job.id}/status`, { token: customer.token, body: { status: 'open' }});
  assert(r.status === 400, 'invalid status transition rejected');
  r = await api('PATCH', `/api/jobs/${job.id}/status`, { token: customer.token, body: { status: 'completed' }});
  assert(r.status === 200 && r.data.job.status === 'completed', 'customer marks completed');

  console.log('\n-- Ratings --');
  // Cannot rate out of range
  r = await api('POST', `/api/jobs/${job.id}/rating`, { token: customer.token, body: { rating: 9 }});
  assert(r.status === 400, 'rating out of range rejected');
  // Rate ok
  r = await api('POST', `/api/jobs/${job.id}/rating`, { token: customer.token, body: { rating: 5, comment: 'Excellent, on time' }});
  assert(r.status === 201, 'customer rates 5 stars');
  // Cannot rate twice
  r = await api('POST', `/api/jobs/${job.id}/rating`, { token: customer.token, body: { rating: 3 }});
  assert(r.status === 409, 'cannot rate the same job twice');

  // elec2 profile rating updated
  r = await api('POST', '/api/auth/login', { body: { identifier: `rudo${uniq}@mail.com`, password: 'secret123' }});
  assert(r.data.user.profile.rating === 5 && r.data.user.profile.rating_count === 1 && r.data.user.profile.jobs_done === 1,
    'tradesperson rating/jobs_done updated (5.00, 1 rating, 1 job)');

  // Rating shows on future offer for this tradesperson
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'electrician', description: 'Second job', location: 'Bulawayo', budget: 50 }});
  const job2 = r.data.job;
  await api('POST', `/api/jobs/${job2.id}/offers`, { token: elec2.token, body: { price: 55 }});
  r = await api('GET', `/api/jobs/${job2.id}`, { token: customer.token });
  const o = r.data.job.offers.find((x) => x.tradesperson_id === elec2.user.id);
  assert(o && o.rating === 5 && o.jobs_done === 1, 'offer surfaces tradesperson rating for customer decision');

  console.log('\n-- Worker mark-done + completion note --');
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'electrician', description: 'Ceiling fan install', location: 'Bulawayo', budget: 40 }});
  const job3 = r.data.job;
  r = await api('POST', `/api/jobs/${job3.id}/offers`, { token: elec1.token, body: { price: 40 }});
  r = await api('GET', `/api/jobs/${job3.id}`, { token: customer.token });
  const off3 = r.data.job.offers[0];
  await api('POST', `/api/offers/${off3.id}/accept`, { token: customer.token });
  r = await api('POST', `/api/jobs/${job3.id}/mark-done`, { token: elec2.token, body: { note: 'x' }});
  assert(r.status === 403, 'non-assigned tradesperson cannot mark job done');
  r = await api('POST', `/api/jobs/${job3.id}/mark-done`, { token: elec1.token, body: { note: 'All wired and tested.' }});
  assert(r.status === 200 && r.data.job.worker_marked_done === true && r.data.job.completion_note === 'All wired and tested.' && r.data.job.status === 'in_progress',
    'assigned worker marks done -> in_progress + note saved');
  r = await api('GET', `/api/jobs/${job3.id}`, { token: customer.token });
  assert(r.data.job.worker_marked_done === true && r.data.job.completion_note === 'All wired and tested.',
    'customer sees worker-done marker + completion note');
  r = await api('PATCH', `/api/jobs/${job3.id}/status`, { token: customer.token, body: { status: 'completed' }});
  assert(r.status === 200 && r.data.job.status === 'completed', 'customer confirms completion after worker marked done');
  r = await api('POST', `/api/jobs/${job3.id}/rating`, { token: customer.token, body: { rating: 4, comment: 'Good work' }});
  assert(r.status === 201, 'customer rates after two-sided completion');

  console.log('\n-- Withdraw offer --');
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'electrician', description: 'Rewire garage', location: 'Bulawayo', budget: 200 }});
  const job4 = r.data.job;
  r = await api('POST', `/api/jobs/${job4.id}/offers`, { token: elec1.token, body: { price: 210 }});
  const off4 = r.data.offer;
  r = await api('POST', `/api/offers/${off4.id}/withdraw`, { token: elec2.token });
  assert(r.status === 403, "cannot withdraw someone else's offer");
  r = await api('POST', `/api/offers/${off4.id}/withdraw`, { token: elec1.token });
  assert(r.status === 200, 'tradesperson withdraws own pending offer');
  r = await api('POST', `/api/offers/${off4.id}/withdraw`, { token: elec1.token });
  assert(r.status === 400, 'cannot withdraw an already-withdrawn offer');

  console.log('\n-- Profile update --');
  r = await api('PATCH', '/api/profile', { token: elec1.token, body: { skills: 'Wiring, solar, geysers', bio: '10 years experience.' }});
  assert(r.status === 200 && r.data.profile.skills.includes('solar'), 'tradesperson updates profile');
  r = await api('GET', '/api/auth/me', { token: elec1.token });
  assert(r.data.user.profile.bio === '10 years experience.', 'profile change reflected in /me');
  r = await api('PATCH', '/api/profile', { token: customer.token, body: { bio: 'x' }});
  assert(r.status === 403, 'customer cannot update a tradesperson profile');

  console.log('\n-- Stats --');
  r = await api('GET', '/api/stats', { token: customer.token });
  assert(r.status === 200 && typeof r.data.stats.completed === 'number' && typeof r.data.stats.offers_received === 'number', 'customer stats returned');
  r = await api('GET', '/api/stats', { token: elec1.token });
  assert(r.status === 200 && typeof r.data.stats.available === 'number' && typeof r.data.stats.pending_offers === 'number', 'tradesperson stats returned');

  console.log('\n-- Support inbox --');
  r = await api('POST', '/api/support', { body: { name: 'Jane', email: 'jane@mail.com', subject: 'Help', message: 'I need assistance' }});
  assert(r.status === 201, 'support message accepted');
  r = await api('POST', '/api/support', { body: { name: 'Jane', email: 'bad-email', subject: 'Help', message: 'hi there' }});
  assert(r.status === 400, 'support rejects invalid email');
  r = await api('POST', '/api/support', { body: { name: '', email: '', subject: '', message: '' }});
  assert(r.status === 400, 'support rejects empty fields');

  console.log('\n-- Expanded categories + Other --');
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Tiler Tom', email: `tiler${uniq}@mail.com`,
    phone: `074${uniq}`.slice(0, 12),
    password: 'secret123', location: 'Bulawayo', category: 'tiler' }});
  assert(r.status === 201 && r.data.user.profile.category === 'tiler', 'register tradesperson with new category (tiler)');
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'tiler', description: 'Tile a bathroom', location: 'Bulawayo', budget: 90 }});
  assert(r.status === 201 && r.data.job.category === 'tiler', 'post a tiler job');

  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'other', description: 'Need help', location: 'Bulawayo', budget: 30 }});
  assert(r.status === 400, '"other" job without a custom trade is rejected');
  r = await api('POST', '/api/jobs', { token: customer.token, body: {
    category: 'other', custom_category: 'Pool technician', description: 'Service my pool', location: 'Bulawayo', budget: 60 }});
  assert(r.status === 201 && r.data.job.custom_category === 'Pool technician', 'post an "other" job with a custom trade');
  const otherJob = r.data.job;

  r = await api('POST', `/api/jobs/${otherJob.id}/offers`, { token: plumber.token, body: { price: 55 }});
  assert(r.status === 201, 'any tradesperson (plumber) can bid on an "other" job');

  r = await api('GET', '/api/jobs?status=open&category=other', { token: elec1.token });
  assert(r.status === 200 && r.data.jobs.some((j) => j.id === otherJob.id && j.custom_category === 'Pool technician'),
    '"other" job surfaces its custom trade when browsing');

  r = await api('GET', '/api/meta/categories');
  assert(r.data.categories.includes('tiler') && r.data.categories.includes('other') && r.data.categories.length >= 20,
    'categories list expanded (20+) and includes "other"');

  console.log('\n-- Credits wallet --');
  // Wallet starts empty with bundles + config flags exposed.
  r = await api('GET', '/api/wallet', { token: elec1.token });
  assert(r.status === 200 && r.data.balance === 0, 'new wallet balance is 0');
  assert(Array.isArray(r.data.bundles) && r.data.bundles.length >= 3
    && r.data.bundles.every((b) => b.usd && b.credits && b.id), 'wallet exposes credit bundles');
  assert(r.data.billingEnabled === false, 'billing disabled at launch (free)');
  assert(Array.isArray(r.data.ledger), 'wallet returns a ledger array');

  // Customers get a wallet too (harmless) but bundle validation still applies.
  r = await api('POST', '/api/wallet/topup', { token: elec1.token, body: { bundleId: 'nope' } });
  assert(r.status === 400, 'top-up with unknown bundle rejected (400)');

  // Mobile method needs a valid phone (validated before any network call).
  r = await api('POST', '/api/wallet/topup', { token: elec1.token, body: { bundleId: 'standard', method: 'ecocash', phone: '123' } });
  assert(r.status === 400, 'ecocash top-up with bad phone rejected (400)');

  // Unsupported method rejected.
  r = await api('POST', '/api/wallet/topup', { token: elec1.token, body: { bundleId: 'standard', method: 'bitcoin' } });
  assert(r.status === 400, 'unsupported top-up method rejected (400)');

  // Auth required.
  r = await api('GET', '/api/wallet');
  assert(r.status === 401, 'wallet requires authentication (401)');

  console.log('\n-- Rate limiting --');
  let got429 = false;
  for (let i = 0; i < 20; i++) {
    const rr = await api('POST', '/api/auth/login', { body: { identifier: 'nobody@example.com', password: 'wrong' }});
    if (rr.status === 429) { got429 = true; break; }
  }
  assert(got429, 'auth endpoint rate-limits repeated failed logins (429)');

  console.log('\n=== Results ===');
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed assertions:');
    fails.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('\nAll tests passed. \u2713');
}

run().catch((err) => { console.error('Test runner crashed:', err); process.exit(1); });
