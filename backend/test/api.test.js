// End-to-end API test for TradeLink. Run against a live server.
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
  console.log('\n=== TradeLink API E2E tests ===\n');

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
    password: 'secret123', location: 'Bulawayo', category: 'electrician', skills: 'Wiring, solar',
  }});
  assert(r.status === 201 && r.data.user.profile.category === 'electrician', 'register electrician w/ profile');
  const elec1 = r.data;

  // Register a 2nd electrician
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Rudo Dube', email: `rudo${uniq}@mail.com`,
    password: 'secret123', location: 'Zvishavane', category: 'electrician',
  }});
  const elec2 = r.data;
  assert(r.status === 201, 'register 2nd electrician');

  // Register a plumber (should NOT see electrician jobs / cannot bid)
  r = await api('POST', '/api/auth/register', { body: {
    role: 'tradesperson', name: 'Farai Sibanda', email: `farai${uniq}@mail.com`,
    password: 'secret123', location: 'Bulawayo', category: 'plumber',
  }});
  const plumber = r.data;
  assert(r.status === 201, 'register plumber');

  // Duplicate email rejected
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'Dup', email: `thandi${uniq}@mail.com`, password: 'secret123', location: 'Bulawayo',
  }});
  assert(r.status === 409, 'duplicate email rejected (409)');

  // Bad password rejected
  r = await api('POST', '/api/auth/register', { body: {
    role: 'customer', name: 'Short', email: `x${uniq}@mail.com`, password: '123', location: 'Bulawayo',
  }});
  assert(r.status === 400, 'short password rejected (400)');

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
