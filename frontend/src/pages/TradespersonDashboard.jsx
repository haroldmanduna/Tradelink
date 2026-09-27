import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABELS, CATEGORY_ICON } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Stars, StatusBadge, Empty, money, timeAgo } from '../components.jsx';

export default function TradespersonDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('open');

  return (
    <div className="container">
      <div className="flex between wrap" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="h1">{CATEGORY_ICON[user.profile?.category]} {CATEGORY_LABELS[user.profile?.category]} dashboard</h1>
          <p className="sub" style={{ margin: 0 }}>
            <Stars value={user.profile?.rating || 0} count={user.profile?.rating_count || 0} />
            {' · '}{user.profile?.jobs_done || 0} jobs completed
            {user.profile?.verified && ' · ✓ Verified'}
          </p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Open jobs</div>
        <div className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>My offers</div>
        <div className={`tab ${tab === 'assigned' ? 'active' : ''}`} onClick={() => setTab('assigned')}>Accepted jobs</div>
      </div>

      {tab === 'open' && <OpenJobs myCategory={user.profile?.category} />}
      {tab === 'offers' && <MyOffers />}
      {tab === 'assigned' && <AssignedJobs />}
    </div>
  );
}

function OpenJobs({ myCategory }) {
  const [category, setCategory] = useState(myCategory || 'electrician');
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    setJobs(null);
    api.get(`/jobs?status=open&category=${category}`).then((d) => setJobs(d.jobs)).catch((e) => setError(e.message));
  }, [category]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="flex wrap" style={{ gap: 8, marginBottom: 16 }}>
        {Object.keys(CATEGORY_LABELS).map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {CATEGORY_ICON[c]} {CATEGORY_LABELS[c]}
            {c === myCategory ? ' ★' : ''}
          </button>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}
      {category !== myCategory && (
        <div className="alert info">You can browse any category, but you can only send offers on <strong>{CATEGORY_LABELS[myCategory]}</strong> jobs.</div>
      )}
      {jobs === null && <div className="loading">Loading…</div>}
      {jobs && jobs.length === 0 && (
        <div className="card"><Empty icon="🔍" title="No open jobs here right now">Check back soon or try another category.</Empty></div>
      )}

      {jobs && jobs.map((j) => (
        <div key={j.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${j.id}`)}>
          <div className="job-row">
            <div className="job-icon">{CATEGORY_ICON[j.category]}</div>
            <div style={{ flex: 1 }}>
              <div className="flex between wrap">
                <strong>{CATEGORY_LABELS[j.category]} · {j.location}</strong>
                <span className="price">{money(j.budget)}</span>
              </div>
              <div className="muted small" style={{ margin: '4px 0 8px' }}>
                by {j.customer_name} · {timeAgo(j.created_at)} · {j.offer_count} {Number(j.offer_count) === 1 ? 'offer' : 'offers'}
              </div>
              <div>{j.description}</div>
              {j.my_offer && (
                <div style={{ marginTop: 10 }}>
                  <span className={`badge ${j.my_offer.status === 'accepted' ? 'completed' : 'open'}`}>
                    Your offer: {money(j.my_offer.price)} ({j.my_offer.status})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function MyOffers() {
  const [offers, setOffers] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/offers/mine').then((d) => setOffers(d.offers)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (offers === null) return <div className="loading">Loading…</div>;
  if (offers.length === 0) return <div className="card"><Empty icon="💬" title="No offers yet">Browse open jobs and send your first offer.</Empty></div>;

  return offers.map((o) => (
    <div key={o.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${o.job_id}`)}>
      <div className="flex between wrap">
        <div>
          <strong>{CATEGORY_LABELS[o.category]} · {o.location}</strong>
          <div className="muted small">{o.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="price">{money(o.price)}</div>
          <span className={`badge ${o.status === 'accepted' ? 'completed' : o.status === 'rejected' ? 'cancelled' : 'open'}`}>{o.status}</span>
        </div>
      </div>
    </div>
  ));
}

function AssignedJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/jobs/assigned').then((d) => setJobs(d.jobs)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (jobs === null) return <div className="loading">Loading…</div>;
  if (jobs.length === 0) return <div className="card"><Empty icon="📋" title="No accepted jobs yet">When a customer accepts your offer, the job appears here.</Empty></div>;

  return jobs.map((j) => (
    <div key={j.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${j.id}`)}>
      <div className="job-row">
        <div className="job-icon">{CATEGORY_ICON[j.category]}</div>
        <div style={{ flex: 1 }}>
          <div className="flex between wrap">
            <strong>{CATEGORY_LABELS[j.category]} · {j.location}</strong>
            <StatusBadge status={j.status} />
          </div>
          <div className="muted small" style={{ margin: '4px 0 8px' }}>
            Customer: {j.customer_name}{j.customer_phone ? ` · 📞 ${j.customer_phone}` : ''}
          </div>
          <div>{j.description}</div>
          <div className="flex between wrap" style={{ marginTop: 10 }}>
            <span className="price">Agreed: {money(j.agreed_price)}</span>
            {j.rating && <span className="stars">Rated {j.rating.rating}★</span>}
          </div>
        </div>
      </div>
    </div>
  ));
}
