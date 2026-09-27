import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABELS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Stars, StarInput, StatusBadge, Alert, Loading, money, timeAgo } from '../components.jsx';
import { TradeIcon, Icon } from '../icons.jsx';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { job } = await api.get(`/jobs/${id}`);
      setJob(job);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="container"><div className="alert error">{error}</div><Link to="/">← Home</Link></div>;
  if (!job) return <Loading />;

  const isCustomer = user.role === 'customer';
  const isOwner = isCustomer && job.customer_id === user.id;

  async function act(fn, successMsg) {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      if (successMsg) setNotice(successMsg);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <Link to={isCustomer ? '/customer' : '/pro'} className="small flex" style={{ display: 'inline-flex', width: 'auto' }}><Icon name="arrowLeft" size={15} /> Back</Link>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="job-row">
          <div className="job-icon"><TradeIcon name={job.category} size={24} /></div>
          <div style={{ flex: 1 }}>
            <div className="flex between wrap">
              <strong style={{ fontSize: 18 }}>{CATEGORY_LABELS[job.category]}</strong>
              <StatusBadge status={job.status} />
            </div>
            <div className="muted small" style={{ margin: '4px 0 10px' }}>
              {job.location} · posted {timeAgo(job.created_at)}
              {job.customer_name ? ` · by ${job.customer_name}` : ''}
            </div>
            <p style={{ marginTop: 0 }}>{job.description}</p>
            <div className="price">Budget: {money(job.budget)}</div>
          </div>
        </div>

        {job.customer_phone && (
          <div className="alert ok" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="contact-box">
              <span className="ic"><Icon name="phone" size={18} /></span>
              <span>Contact: <strong>{job.customer_phone}</strong> — arrange the work &amp; payment directly.</span>
            </div>
          </div>
        )}
      </div>

      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {isOwner
        ? <CustomerView job={job} act={act} busy={busy} />
        : <TradespersonView job={job} user={user} act={act} busy={busy} />}
    </div>
  );
}

/* -------------------- CUSTOMER -------------------- */
function CustomerView({ job, act, busy }) {
  const offers = job.offers || [];
  const bestPrice = offers.filter((o) => o.status !== 'rejected').reduce((m, o) => Math.min(m, o.price), Infinity);

  return (
    <>
      {job.status === 'open' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Offers ({offers.length})</h3>
          {offers.length === 0 && <p className="muted">No offers yet. Tradespeople matching this category will see your job and respond.</p>}
          {offers.map((o) => (
            <OfferCard key={o.id} o={o} best={o.price === bestPrice}
              action={
                <button className="btn accent sm" disabled={busy}
                  onClick={() => act(() => api.post(`/offers/${o.id}/accept`), 'Offer accepted! You can now contact the tradesperson.')}>
                  Accept offer
                </button>
              } />
          ))}
        </div>
      )}

      {job.status !== 'open' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Your tradesperson</h3>
          {offers.filter((o) => o.status === 'accepted').map((o) => (
            <OfferCard key={o.id} o={o} accepted />
          ))}

          <div className="divider" />

          {job.status === 'matched' && (
            <div className="flex wrap">
              <button className="btn" disabled={busy}
                onClick={() => act(() => api.patch(`/jobs/${job.id}/status`, { status: 'in_progress' }), 'Marked as in progress.')}>
                <Icon name="play" size={15} /> Start work
              </button>
              <button className="btn danger" disabled={busy}
                onClick={() => act(() => api.patch(`/jobs/${job.id}/status`, { status: 'cancelled' }), 'Job cancelled.')}>
                Cancel job
              </button>
            </div>
          )}

          {job.status === 'in_progress' && (
            <button className="btn accent" disabled={busy}
              onClick={() => act(() => api.patch(`/jobs/${job.id}/status`, { status: 'completed' }), 'Job completed! Please leave a rating.')}>
              <Icon name="check" size={16} /> Mark as completed
            </button>
          )}

          {job.status === 'completed' && <RatingSection job={job} act={act} busy={busy} />}
          {job.status === 'cancelled' && <p className="muted">This job was cancelled.</p>}
        </div>
      )}
    </>
  );
}

function RatingSection({ job, act, busy }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  if (done) return <div className="alert ok" style={{ margin: 0 }}>Thanks for rating! ⭐ {rating}/5</div>;

  return (
    <div>
      <h4 style={{ margin: '0 0 8px' }}>Rate your tradesperson</h4>
      <StarInput value={rating} onChange={setRating} />
      <div className="field" style={{ marginTop: 12 }}>
        <textarea className="textarea" placeholder="Leave a comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <button className="btn" disabled={busy || rating === 0}
        onClick={() => act(async () => {
          await api.post(`/jobs/${job.id}/rating`, { rating, comment });
          setDone(true);
        })}>
        Submit rating
      </button>
    </div>
  );
}

/* -------------------- TRADESPERSON -------------------- */
function TradespersonView({ job, user, act, busy }) {
  const mine = (job.offers || []).find((o) => o.tradesperson_id === user.id);
  const canBid = job.status === 'open' && user.profile && user.profile.category === job.category;
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');

  if (user.profile && user.profile.category !== job.category) {
    return <div className="card"><p className="muted">This is a {CATEGORY_LABELS[job.category]} job — outside your trade ({CATEGORY_LABELS[user.profile.category]}).</p></div>;
  }

  return (
    <div className="card">
      {mine && (
        <div className={`alert ${mine.status === 'accepted' ? 'ok' : mine.status === 'rejected' ? 'error' : 'info'}`}>
          Your offer: <strong>{money(mine.price)}</strong> — {mine.status === 'accepted' ? '🎉 Accepted!' : mine.status === 'rejected' ? 'Not selected' : 'Pending customer review'}
        </div>
      )}

      {canBid ? (
        <>
          <h3 style={{ marginTop: 0 }}>{mine ? 'Update your offer' : 'Send an offer'}</h3>
          <div className="flex wrap" style={{ gap: 8, marginBottom: 14 }}>
            <button className="btn accent" disabled={busy}
              onClick={() => act(() => api.post(`/jobs/${job.id}/offers`, { message }), `You accepted the ${money(job.budget)} budget.`)}>
              Accept budget ({money(job.budget)})
            </button>
            <span className="muted small" style={{ alignSelf: 'center' }}>or counter-offer below</span>
          </div>
          <div className="row">
            <div className="field">
              <label>Your price (USD)</label>
              <input className="input" type="number" min="0" value={price}
                onChange={(e) => setPrice(e.target.value)} placeholder={String(job.budget)} />
            </div>
          </div>
          <div className="field">
            <label>Message <span className="muted small">(optional)</span></label>
            <input className="input" value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Price includes materials; can start tomorrow." />
          </div>
          <button className="btn" disabled={busy || price === ''}
            onClick={() => act(() => api.post(`/jobs/${job.id}/offers`, { price: Number(price), message }),
              mine ? 'Offer updated.' : 'Counter-offer sent.')}>
            {mine ? 'Update offer' : 'Send counter-offer'}
          </button>
        </>
      ) : (
        job.status !== 'open' && !mine && <p className="muted">This job is no longer open for offers.</p>
      )}
    </div>
  );
}

/* -------------------- shared -------------------- */
function OfferCard({ o, best, accepted, action }) {
  return (
    <div className={`offer ${accepted ? 'accepted' : ''} ${o.status === 'rejected' ? 'rejected' : ''} ${best && !accepted ? 'best' : ''}`}>
      <div className="flex between wrap">
        <div>
          <strong>{o.tradesperson_name}</strong>{' '}
          {o.verified && <span className="badge verified"><Icon name="verified" size={12} /> Verified</span>}
          <div className="small muted">{o.tradesperson_location} · {o.jobs_done} jobs done</div>
          <div style={{ marginTop: 4 }}><Stars value={o.rating} count={o.rating_count} /></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="price" style={{ fontSize: 20 }}>{money(o.price)}</div>
          {best && !accepted && <span className="badge verified">Best price</span>}
        </div>
      </div>
      {o.message && <p className="small" style={{ margin: '10px 0 0' }}>“{o.message}”</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
