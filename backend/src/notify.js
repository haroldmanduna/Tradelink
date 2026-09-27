const webpush = require('web-push');
const { query } = require('./db');
const { CATEGORY_LABELS } = require('./constants');

// --- Web Push setup (VAPID) -------------------------------------------------
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tradelink.co.zw';
let pushEnabled = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); pushEnabled = true; }
  catch (e) { console.error('VAPID setup failed:', e.message); }
}

function tradeLabel(category, custom) {
  if (category === 'other') return (custom && String(custom).trim()) ? String(custom).trim() : 'Other';
  return CATEGORY_LABELS[category] || category;
}

// Fire a web push to every device a user has registered. Prunes dead ones.
async function pushToUser(userId, payload) {
  if (!pushEnabled) return;
  try {
    const { rows } = await query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId]
    );
    await Promise.all(rows.map(async (s) => {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]).catch(() => {});
        } else {
          console.error('push send failed:', err.statusCode, err.message);
        }
      }
    }));
  } catch (e) { console.error('pushToUser failed:', e.message); }
}

// Create an in-app notification row AND send a web push for it.
async function notify(userId, { type, title, body, jobId }) {
  await query(
    'INSERT INTO notifications (user_id, type, title, body, job_id) VALUES ($1,$2,$3,$4,$5)',
    [userId, type, title, body || null, jobId || null]
  );
  await pushToUser(userId, {
    title, body: body || '',
    url: jobId ? `/jobs/${jobId}` : '/',
    tag: `${type}-${jobId || ''}`,
  });
}

// A new job was posted → alert matching tradespeople.
// Rule: same-town category matches first; if fewer than 3, widen to all
// category matches so early-stage jobs still reach nearby pros. Returns count.
async function notifyJobPosted(job) {
  try {
    const label = tradeLabel(job.category, job.custom_category);
    const sameTown = await query(
      `SELECT u.id FROM users u JOIN tradesperson_profiles p ON p.user_id = u.id
        WHERE u.suspended = false AND p.category = $1 AND u.location = $2 AND u.id <> $3`,
      [job.category, job.location, job.customer_id]
    );
    let ids = sameTown.rows.map((r) => r.id);
    if (ids.length < 3) {
      const all = await query(
        `SELECT u.id FROM users u JOIN tradesperson_profiles p ON p.user_id = u.id
          WHERE u.suspended = false AND p.category = $1 AND u.id <> $2`,
        [job.category, job.customer_id]
      );
      ids = Array.from(new Set([...ids, ...all.rows.map((r) => r.id)]));
    }
    const title = `New ${label} job`;
    const body = `${job.location} · Budget $${Number(job.budget).toLocaleString()}`;
    await Promise.all(ids.map((uid) => notify(uid, { type: 'job_match', title, body, jobId: job.id })));
    return ids.length;
  } catch (e) { console.error('notifyJobPosted failed:', e.message); return 0; }
}

// A tradesperson sent an offer → alert the job's customer.
async function notifyOfferMade(customerId, job) {
  try {
    const label = tradeLabel(job.category, job.custom_category);
    await notify(customerId, {
      type: 'offer_made', title: 'New offer received',
      body: `You have a new offer on your ${label} job.`, jobId: job.id,
    });
  } catch (e) { console.error('notifyOfferMade failed:', e.message); }
}

// A customer accepted an offer → alert the winning tradesperson.
async function notifyOfferAccepted(tradespersonId, job) {
  try {
    const label = tradeLabel(job.category, job.custom_category);
    await notify(tradespersonId, {
      type: 'offer_accepted', title: 'Your offer was accepted',
      body: `You got the ${label} job in ${job.location}. Tap to see the customer's contact.`, jobId: job.id,
    });
  } catch (e) { console.error('notifyOfferAccepted failed:', e.message); }
}

module.exports = {
  notify, pushToUser, notifyJobPosted, notifyOfferMade, notifyOfferAccepted,
  isPushEnabled: () => pushEnabled,
};
