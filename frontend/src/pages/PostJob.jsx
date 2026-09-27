import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, CATEGORY_LABELS } from '../api.js';
import { Alert } from '../components.jsx';
import { TradeIcon, Icon } from '../icons.jsx';

export default function PostJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: 'electrician', customCategory: '', description: '', location: 'Bulawayo', budget: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { job } = await api.post('/jobs', {
        category: form.category,
        custom_category: form.category === 'other' ? form.customCategory : undefined,
        description: form.description,
        location: form.location,
        budget: Number(form.budget),
      });
      navigate(`/jobs/${job.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <Link to="/customer" className="small flex" style={{ display: 'inline-flex', width: 'auto' }}><Icon name="arrowLeft" size={15} /> Back to my jobs</Link>
      <h1 className="h1" style={{ marginTop: 12 }}>Post a job</h1>
      <p className="sub">Tell us what you need. Matching tradespeople will send you offers.</p>

      <div className="card">
        <Alert kind="error">{error}</Alert>
        <form onSubmit={submit}>
          <div className="field">
            <label>What do you need?</label>
            <div className="flex wrap" style={{ gap: 8 }}>
              {Object.keys(CATEGORY_LABELS).map((c) => (
                <button type="button" key={c}
                  className={`chip ${form.category === c ? 'active' : ''}`}
                  onClick={() => upd('category', c)}>
                  <TradeIcon name={c} size={17} /> {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {form.category === 'other' && (
            <div className="field">
              <label>What kind of tradesperson do you need?</label>
              <input className="input" required value={form.customCategory}
                onChange={(e) => upd('customCategory', e.target.value)} maxLength={60}
                placeholder="e.g. Chainsaw sharpener, pool technician, sign writer…" />
            </div>
          )}

          <div className="field">
            <label>Describe the job</label>
            <textarea className="textarea" required value={form.description}
              onChange={(e) => upd('description', e.target.value)}
              placeholder="e.g. Need a geyser replaced and two leaking taps fixed in a 3-bed house." />
          </div>

          <div className="row">
            <div className="field">
              <label>Location</label>
              <select className="select" value={form.location} onChange={(e) => upd('location', e.target.value)}>
                <option>Bulawayo</option>
                <option>Zvishavane</option>
                <option>Gweru</option>
                <option>Masvingo</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label>Your budget (USD)</label>
              <input className="input" type="number" min="0" step="1" required value={form.budget}
                onChange={(e) => upd('budget', e.target.value)} placeholder="e.g. 80" />
            </div>
          </div>

          <p className="small muted">
            Tradespeople can accept your budget or send a counter-offer — you choose who to hire.
          </p>

          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'Posting…' : 'Post job'}
          </button>
        </form>
      </div>
    </div>
  );
}
