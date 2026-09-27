import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, CATEGORY_LABELS } from '../api.js';
import { StatusBadge, Empty, Loading, StatBar, money, timeAgo } from '../components.jsx';
import { TradeIcon, Icon } from '../icons.jsx';

export default function CustomerDashboard() {
  const [jobs, setJobs] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/jobs/mine').then((d) => setJobs(d.jobs)).catch((e) => setError(e.message));
    api.get('/stats').then((d) => setStats(d.stats)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="flex between" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="h1">My jobs</h1>
          <p className="sub" style={{ margin: 0 }}>Track your posted jobs and offers.</p>
        </div>
        <Link className="btn" to="/post"><Icon name="plus" size={16} /> Post a job</Link>
      </div>

      {stats && (
        <StatBar items={[
          { v: stats.open, l: 'Open jobs' },
          { v: stats.active, l: 'In progress' },
          { v: stats.completed, l: 'Completed' },
          { v: stats.offers_received, l: 'Offers received' },
        ]} />
      )}

      {error && <div className="alert error">{error}</div>}
      {jobs === null && <Loading />}

      {jobs && jobs.length === 0 && (
        <div className="card">
          <Empty icon="briefcase" title="No jobs yet">
            Post your first job and start receiving offers from local tradespeople.
            <div style={{ marginTop: 16 }}>
              <Link className="btn" to="/post">Post a job</Link>
            </div>
          </Empty>
        </div>
      )}

      {jobs && jobs.map((j) => (
        <div key={j.id} className="card tap" onClick={() => navigate(`/jobs/${j.id}`)}>
          <div className="job-row">
            <div className="job-icon"><TradeIcon name={j.category} size={24} /></div>
            <div style={{ flex: 1 }}>
              <div className="flex between wrap">
                <strong>{CATEGORY_LABELS[j.category]}</strong>
                <StatusBadge status={j.status} />
              </div>
              <div className="muted small" style={{ margin: '4px 0 8px' }}>
                {j.location} · posted {timeAgo(j.created_at)}
              </div>
              <div style={{ marginBottom: 10 }}>{j.description}</div>
              <div className="flex between wrap">
                <span className="small muted">Your budget: <span className="price">{money(j.budget)}</span></span>
                <span className="badge">
                  {j.offer_count} {Number(j.offer_count) === 1 ? 'offer' : 'offers'}
                  {j.status === 'open' && Number(j.offer_count) > 0 ? ' · tap to review' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
