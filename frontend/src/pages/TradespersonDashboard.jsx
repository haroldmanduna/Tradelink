import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABELS, tradeLabel } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Stars, StatusBadge, Empty, Loading, StatBar, Alert, money, timeAgo } from '../components.jsx';
import { TradeIcon, Icon } from '../icons.jsx';

export default function TradespersonDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('open');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then((d) => setStats(d.stats)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="flex between wrap" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="h1 flex" style={{ gap: 10 }}>
            <span className="job-icon" style={{ width: 40, height: 40 }}><TradeIcon name={user.profile?.category} size={22} /></span>
            {CATEGORY_LABELS[user.profile?.category]} dashboard
          </h1>
          <p className="sub flex wrap" style={{ margin: '8px 0 0', gap: 8 }}>
            <Stars value={user.profile?.rating || 0} count={user.profile?.rating_count || 0} />
            {' · '}{user.profile?.jobs_done || 0} jobs completed
            {user.profile?.verified && <span className="badge verified"><Icon name="verified" size={12} /> Verified</span>}
          </p>
        </div>
      </div>

      {stats && (
        <StatBar items={[
          { v: stats.available, l: 'Open jobs for you' },
          { v: stats.pending_offers, l: 'Pending offers' },
          { v: stats.active, l: 'Active jobs' },
          { v: stats.completed, l: 'Completed' },
        ]} />
      )}

      <div className="tabs">
        <div className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Open jobs</div>
        <div className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>My offers</div>
        <div className={`tab ${tab === 'assigned' ? 'active' : ''}`} onClick={() => setTab('assigned')}>Accepted jobs</div>
        <div className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</div>
      </div>

      {tab === 'open' && <OpenJobs myCategory={user.profile?.category} />}
      {tab === 'offers' && <MyOffers />}
      {tab === 'assigned' && <AssignedJobs />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}

function ProfileTab() {
  const { user, refresh } = useAuth();
  const [skills, setSkills] = useState(user.profile?.skills || '');
  const [bio, setBio] = useState(user.profile?.bio || '');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      await api.patch('/profile', { skills, bio });
      await refresh();
      setMsg('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3 style={{ marginTop: 0 }}>Your public profile</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        This is what customers see next to your offers. Trade: <strong>{CATEGORY_LABELS[user.profile?.category]}</strong>.
      </p>
      {msg && <Alert kind="ok">{msg}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      <form onSubmit={save}>
        <div className="field">
          <label>Skills</label>
          <input className="input" value={skills} onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. Wiring, solar installs, geysers, DB boards" maxLength={300} />
        </div>
        <div className="field">
          <label>About you</label>
          <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="Tell customers about your experience, reliability and area you cover." maxLength={600} />
        </div>
        <button className="btn" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
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
            <TradeIcon name={c} size={17} /> {CATEGORY_LABELS[c]}
            {c === myCategory ? <Icon name="star" size={13} style={{ color: 'inherit' }} /> : null}
          </button>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}
      {category === 'other' && (
        <div className="alert info">“Other” jobs are open to every tradesperson — feel free to send an offer if you can help.</div>
      )}
      {category !== myCategory && category !== 'other' && (
        <div className="alert info">You can browse any category, but you can only send offers on <strong>{CATEGORY_LABELS[myCategory]}</strong> and <strong>Other</strong> jobs.</div>
      )}
      {jobs === null && <Loading />}
      {jobs && jobs.length === 0 && (
        <div className="card"><Empty icon="search" title="No open jobs here right now">Check back soon or try another category.</Empty></div>
      )}

      {jobs && jobs.map((j) => (
        <div key={j.id} className="card tap" onClick={() => navigate(`/jobs/${j.id}`)}>
          <div className="job-row">
            <div className="job-icon"><TradeIcon name={j.category} size={24} /></div>
            <div style={{ flex: 1 }}>
              <div className="flex between wrap">
                <strong>{tradeLabel(j.category, j.custom_category)} · {j.location}</strong>
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
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.get('/offers/mine').then((d) => setOffers(d.offers)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function withdraw(e, id) {
    e.stopPropagation();
    setBusy(true);
    try { await api.post(`/offers/${id}/withdraw`); load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (error) return <div className="alert error">{error}</div>;
  if (offers === null) return <Loading />;
  if (offers.length === 0) return <div className="card"><Empty icon="chat" title="No offers yet">Browse open jobs and send your first offer.</Empty></div>;

  return offers.map((o) => (
    <div key={o.id} className="card tap" onClick={() => navigate(`/jobs/${o.job_id}`)}>
      <div className="flex between wrap">
        <div>
          <strong>{tradeLabel(o.category, o.custom_category)} · {o.location}</strong>
          <div className="muted small">{o.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="price">{money(o.price)}</div>
          <span className={`badge ${o.status === 'accepted' ? 'completed' : (o.status === 'rejected' || o.status === 'withdrawn') ? 'cancelled' : 'open'}`}>{o.status}</span>
        </div>
      </div>
      {o.status === 'pending' && o.job_status === 'open' && (
        <div style={{ marginTop: 10 }}>
          <button className="btn danger sm" disabled={busy} onClick={(e) => withdraw(e, o.id)}>
            <Icon name="x" size={14} /> Withdraw
          </button>
        </div>
      )}
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
  if (jobs === null) return <Loading />;
  if (jobs.length === 0) return <div className="card"><Empty icon="briefcase" title="No accepted jobs yet">When a customer accepts your offer, the job appears here.</Empty></div>;

  return jobs.map((j) => (
    <div key={j.id} className="card tap" onClick={() => navigate(`/jobs/${j.id}`)}>
      <div className="job-row">
        <div className="job-icon"><TradeIcon name={j.category} size={24} /></div>
        <div style={{ flex: 1 }}>
          <div className="flex between wrap">
            <strong>{tradeLabel(j.category, j.custom_category)} · {j.location}</strong>
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
