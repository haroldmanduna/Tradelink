import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api, CATEGORY_LABELS } from '../api.js';
import { Alert, LocationSelect } from '../components.jsx';
import { DEFAULT_LOCATION } from '../locations.js';
import { Icon } from '../icons.jsx';

function homePath(user) {
  if (user.role === 'admin') return '/admin';
  return user.role === 'customer' ? '/customer' : '/pro';
}

// Loads Google Identity Services once and reports when it's ready.
function useGoogleScript() {
  const [ready, setReady] = useState(!!(window.google && window.google.accounts));
  useEffect(() => {
    if (window.google && window.google.accounts) { setReady(true); return; }
    let timer;
    const existing = document.getElementById('gsi-script');
    if (existing) {
      timer = setInterval(() => { if (window.google && window.google.accounts) { setReady(true); clearInterval(timer); } }, 120);
      return () => clearInterval(timer);
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.id = 'gsi-script';
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// Renders the official "Sign in with Google" button — only if the backend has a
// Google client id configured. Otherwise renders nothing (feature dormant).
function GoogleSignIn({ onCredential, register }) {
  const [clientId, setClientId] = useState(null);
  const ready = useGoogleScript();
  const divRef = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  useEffect(() => { api.get('/meta/config').then((c) => setClientId(c.googleClientId)).catch(() => {}); }, []);

  useEffect(() => {
    if (!ready || !clientId || !divRef.current || !(window.google && window.google.accounts)) return;
    window.google.accounts.id.initialize({ client_id: clientId, callback: (resp) => cbRef.current(resp.credential) });
    divRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(divRef.current, {
      theme: 'outline', size: 'large', shape: 'pill', width: 300,
      text: register ? 'signup_with' : 'signin_with',
    });
  }, [ready, clientId, register]);

  if (!clientId) return null;
  return (
    <>
      <div className="or-divider"><span>or</span></div>
      <div className="gsi-wrap"><div ref={divRef} /></div>
    </>
  );
}

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { login, register, loginWithGoogle } = useAuth();
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
      navigate(homePath(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(credential) {
    setError('');
    setBusy(true);
    try {
      // On register, use the selected role (+ category for tradespeople).
      const user = await loginWithGoogle(
        credential,
        isRegister ? role : undefined,
        isRegister && role === 'tradesperson' ? form.category : undefined,
      );
      navigate(homePath(user), { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
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

        {/* Google Sign-In temporarily disabled — re-enable by restoring:
            <GoogleSignIn onCredential={handleGoogle} register={isRegister} />
            and setting GOOGLE_CLIENT_ID on the server. */}

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
