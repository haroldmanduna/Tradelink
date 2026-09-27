import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { CATEGORY_LABELS } from '../api.js';
import { Alert, LocationSelect } from '../components.jsx';
import { DEFAULT_LOCATION } from '../locations.js';
import { Icon } from '../icons.jsx';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', location: DEFAULT_LOCATION,
    category: 'electrician', skills: '', identifier: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let user;
      if (isRegister) {
        const payload = {
          role, name: form.name, email: form.email || undefined,
          phone: form.phone || undefined, password: form.password, location: form.location,
        };
        if (role === 'tradesperson') { payload.category = form.category; payload.skills = form.skills; }
        user = await register(payload);
      } else {
        user = await login(form.identifier, form.password);
      }
      navigate(user.role === 'customer' ? '/customer' : '/pro', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1 className="h1">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="sub">
          {isRegister ? 'Join TradeLink in under a minute.' : 'Log in to manage your jobs and offers.'}
        </p>

        <Alert kind="error">{error}</Alert>

        {isRegister && (
          <div className="role-toggle">
            <button type="button" className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}>
              <span className="ric"><Icon name="doc" size={18} /></span>
              <span>
                <div className="rt-title">I need work done</div>
                <div className="rt-desc">Post jobs, get offers</div>
              </span>
            </button>
            <button type="button" className={role === 'tradesperson' ? 'active' : ''} onClick={() => setRole('tradesperson')}>
              <span className="ric"><Icon name="briefcase" size={18} /></span>
              <span>
                <div className="rt-title">I'm a tradesperson</div>
                <div className="rt-desc">Find jobs, send offers</div>
              </span>
            </button>
          </div>
        )}

        <form onSubmit={submit}>
          {isRegister ? (
            <>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g. Sipho Ncube" required />
              </div>
              <div className="row">
                <div className="field">
                  <label>Email <span className="opt">(optional)</span></label>
                  <input className="input" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="you@mail.com" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input className="input" type="tel" value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="0772 000 000" required />
                  <p className="hint">Shared with the other party once a job is matched, so you can be reached.</p>
                </div>
              </div>
              <div className="field">
                <label>Location</label>
                <LocationSelect value={form.location} onChange={(v) => upd('location', v)} />
              </div>
              {role === 'tradesperson' && (
                <>
                  <div className="field">
                    <label>Trade / category</label>
                    <select className="select" value={form.category} onChange={(e) => upd('category', e.target.value)}>
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Skills <span className="muted small">(optional)</span></label>
                    <input className="input" value={form.skills} onChange={(e) => upd('skills', e.target.value)} placeholder="e.g. Wiring, solar installs, geysers" />
                  </div>
                </>
              )}
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={form.password} onChange={(e) => upd('password', e.target.value)} placeholder="At least 6 characters" required />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Email or phone</label>
                <input className="input" value={form.identifier} onChange={(e) => upd('identifier', e.target.value)} placeholder="you@mail.com or 0772…" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={form.password} onChange={(e) => upd('password', e.target.value)} required />
              </div>
            </>
          )}

          <button className="btn block" disabled={busy} type="submit">
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div className="divider" />
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
          {isRegister ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New to TradeLink? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
