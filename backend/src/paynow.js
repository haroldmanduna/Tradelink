// Paynow integration client for TradeLink.
// Docs: https://developers.paynow.co.zw/docs/paynow/
//
// Handles: hash generation/verification, web (redirect) initiation,
// express (mobile-money) initiation, and status polling.
//
// Credentials come from env so they never live in the repo:
//   PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY
//   PAYNOW_RESULT_URL  (server-to-server callback, absolute)
//   PAYNOW_RETURN_URL  (browser return, absolute)

const crypto = require('crypto');

const INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const REMOTE_URL = 'https://www.paynow.co.zw/interface/remotetransaction';

function config() {
  return {
    id: process.env.PAYNOW_INTEGRATION_ID || '',
    key: process.env.PAYNOW_INTEGRATION_KEY || '',
    resultUrl: process.env.PAYNOW_RESULT_URL || '',
    returnUrl: process.env.PAYNOW_RETURN_URL || '',
  };
}

function isConfigured() {
  const c = config();
  return Boolean(c.id && c.key);
}

// Concatenate all values (in the given order, excluding hash), append the
// integration key, SHA512, uppercase hex. Matches Paynow's reference impl.
function generateHash(orderedPairs, integrationKey) {
  const concat = orderedPairs
    .filter(([k]) => k.toLowerCase() !== 'hash')
    .map(([, v]) => (v == null ? '' : String(v)))
    .join('');
  return crypto
    .createHash('sha512')
    .update(concat + integrationKey, 'utf8')
    .digest('hex')
    .toUpperCase();
}

// Verify the hash on a message received from Paynow. `fields` is an array of
// [key, value] pairs in the order they appeared in the response.
function verifyHash(fields, integrationKey) {
  const received = (fields.find(([k]) => k.toLowerCase() === 'hash') || [])[1];
  if (!received) return false;
  const expected = generateHash(fields, integrationKey);
  // Constant-time-ish compare.
  return expected === String(received).toUpperCase();
}

// Parse a Paynow "HTTP POST style" response string into ordered [k,v] pairs.
function parseResponse(text) {
  return text
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      const k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
      const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
      return [k, v];
    });
}

function getField(fields, name) {
  const found = fields.find(([k]) => k.toLowerCase() === name.toLowerCase());
  return found ? found[1] : undefined;
}

// Build the ordered field list for an initiate request, hash it, and return
// the urlencoded body ready to POST.
function buildInitiateBody(params, extraOrdered = []) {
  const c = config();
  const ordered = [
    ['id', c.id],
    ['reference', params.reference],
    ['amount', params.amount],
    ['additionalinfo', params.additionalinfo || ''],
    ['returnurl', params.returnurl || c.returnUrl],
    ['resulturl', params.resulturl || c.resultUrl],
    ['authemail', params.authemail || ''],
    ...extraOrdered,
    ['status', 'Message'],
  ];
  const hash = generateHash(ordered, c.key);
  ordered.push(['hash', hash]);
  const body = ordered
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v == null ? '' : String(v))}`)
    .join('&');
  return body;
}

async function postForm(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await resp.text();
  return parseResponse(text);
}

// Initiate a standard (browser redirect) transaction.
// Returns { ok, browserurl, pollurl } or { ok:false, error }.
async function initiateWeb(params) {
  if (!isConfigured()) return { ok: false, error: 'Paynow not configured.' };
  const c = config();
  const body = buildInitiateBody(params);
  const fields = await postForm(INITIATE_URL, body);
  const status = (getField(fields, 'status') || '').toLowerCase();
  if (status !== 'ok') {
    return { ok: false, error: getField(fields, 'error') || 'Paynow rejected the request.' };
  }
  if (!verifyHash(fields, c.key)) {
    return { ok: false, error: 'Paynow response failed hash verification.' };
  }
  return {
    ok: true,
    browserurl: getField(fields, 'browserurl'),
    pollurl: getField(fields, 'pollurl'),
  };
}

// Initiate an express (mobile money) transaction — customer stays in-app.
// method: 'ecocash' | 'onemoney' | 'innbucks' | 'omari'
// Returns { ok, pollurl, instructions, authorizationcode?, ... }.
async function initiateExpress(params) {
  if (!isConfigured()) return { ok: false, error: 'Paynow not configured.' };
  const c = config();
  const extra = [
    ['method', params.method],
    ['phone', params.phone || ''],
  ];
  // authemail is required for express — ensure present.
  const body = buildInitiateBody({ ...params, authemail: params.authemail || 'noreply@tradelink.co.zw' }, extra);
  const fields = await postForm(REMOTE_URL, body);
  const status = (getField(fields, 'status') || '').toLowerCase();
  if (status !== 'ok') {
    return { ok: false, error: getField(fields, 'error') || 'Paynow rejected the request.' };
  }
  return {
    ok: true,
    pollurl: getField(fields, 'pollurl'),
    instructions: getField(fields, 'instructions'),
    authorizationcode: getField(fields, 'authorizationcode'),
    authorizationexpires: getField(fields, 'authorizationexpires'),
  };
}

// Poll a transaction's status. Returns { ok, status, paid, paynowreference, amount, raw }.
async function poll(pollurl) {
  if (!pollurl) return { ok: false, error: 'No poll URL.' };
  const resp = await fetch(pollurl, { method: 'POST' });
  const text = await resp.text();
  const fields = parseResponse(text);
  const status = (getField(fields, 'status') || '').trim();
  const paidStatuses = ['paid', 'awaiting delivery', 'delivered'];
  return {
    ok: true,
    status,
    paid: paidStatuses.includes(status.toLowerCase()),
    cancelled: ['cancelled', 'failed', 'disputed', 'refunded'].includes(status.toLowerCase()),
    paynowreference: getField(fields, 'paynowreference'),
    amount: getField(fields, 'amount'),
    raw: text,
  };
}

module.exports = {
  isConfigured,
  generateHash,
  verifyHash,
  parseResponse,
  getField,
  initiateWeb,
  initiateExpress,
  poll,
  config,
};
