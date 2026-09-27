import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABELS, tradeLabel } from '../api.js';
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

  // Once matched, reveal the OTHER party's contact (mutual).
  const acceptedOffer = (job.offers || []).find((o) => o.status === 'accepted');
  const contact = isOwner
    ? (acceptedOffer && acceptedOffer.tradesperson_phone
        ? { name: acceptedOffer.tradesperson_name, phone: acceptedOffer.tradesperson_phone, label: 'your tradesperson' }
        : null)
    : (job.customer_phone
        ? { name: job.customer_name, phone: job.customer_phone, label: 'the customer' }
        : null);

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
              <strong style={{ fontSize: 18 }}>{tradeLabel(job.category, job.custom_category)}</strong>
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

        {contact && (
          <div className="alert ok" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="contact-box">
              <span className="ic"><Icon name="phone" size={18} /></span>
              <span>
                Contact {contact.name} ({contact.label}):{' '}
                <a href={`tel:${contact.phone}`}><strong>{contact.phone}</strong></a>
                {' '}— arrange the work &amp; payment directly.
              </span>
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

          {job.worker_marked_done && job.status !== 'completed' && job.status !== 'cancelled' && (
            <div className="alert ok" style={{ marginTop: 14 }}>
              <Icon name="check" size={17} />
              <div>
                <strong>The tradesperson marked this job as done.</strong> Please confirm it's complete, then leave a rating.
                {job.completion_note && (
                  <div className="note-box"><div className="lbl">Their note</div><p>“{job.completion_note}”</p></div>
                )}
              </div>
            </div>
          )}

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
  const isOtherJob = job.category === 'other';
  const canBid = job.status === 'open' && user.profile && (user.profile.category === job.category || isOtherJob);
  const isAssigned = mine && mine.status === 'accepted';
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');

  // Block only when it's a specific trade outside the pro's category ("other" jobs are open to all).
  if (user.profile && user.profile.category !== job.category && !isOtherJob && !mine) {
    return <div className="card"><p className="muted">This is a {tradeLabel(job.category, job.custom_category)} job — outside your trade ({CATEGORY_LABELS[user.profile.category]}).</p></div>;
  }

  const statusMsg = mine
    ? (mine.status === 'accepted' ? 'Accepted — this job is yours!'
      : mine.status === 'rejected' ? 'Not selected'
      : mine.status === 'withdrawn' ? 'You withdrew this offer'
      : 'Pending customer review')
    : '';

  return (
    <div className="card">
      {mine && mine.status !== 'withdrawn' && (
        <div className={`alert ${mine.status === 'accepted' ? 'ok' : mine.status === 'rejected' ? 'error' : 'info'}`}>
          <Icon name={mine.status === 'accepted' ? 'check' : 'chat'} size={17} />
          <div>Your offer: <strong>{money(mine.price)}</strong> — {statusMsg}</div>
        </div>
      )}

      {mine && mine.status === 'pending' && job.status === 'open' && (
        <button className="btn danger sm" disabled={busy} style={{ marginBottom: 14 }}
          onClick={() => act(() => api.post(`/offers/${mine.id}/withdraw`), 'Offer withdrawn.')}>
          <Icon name="x" size={15} /> Withdraw my offer
        </button>
      )}

      {isAssigned && (job.status === 'matched' || job.status === 'in_progress') && (
        <MarkDoneSection job={job} act={act} busy={busy} />
      )}
      {isAssigned && job.status === 'completed' && (
        <div className="alert ok"><Icon name="check" size={17} /><div>This job is complete. Thanks for your work!</div></div>
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

function MarkDoneSection({ job, act, busy }) {
  const [note, setNote] = useState('');
  if (job.worker_marked_done) {
    return (
      <div className="alert info">
        <Icon name="clock" size={17} />
        <div>
          You marked this job as done. Waiting for the customer to confirm &amp; rate.
          {job.completion_note && (
            <div className="note-box"><div className="lbl">Your note</div><p>“{job.completion_note}”</p></div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Finished the work?</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Mark the job as done and leave a note for the customer. They'll confirm completion and rate you.
      </p>
      <div className="field">
        <label>Completion note <span className="muted small">(optional)</span></label>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Replaced the geyser element and tested — all working. Left the old part with you." />
      </div>
      <button className="btn accent" disabled={busy}
        onClick={() => act(() => api.post(`/jobs/${job.id}/mark-done`, { note }), 'Marked as done — the customer will confirm.')}>
        <Icon name="check" size={16} /> Mark work as done
      </button>
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
