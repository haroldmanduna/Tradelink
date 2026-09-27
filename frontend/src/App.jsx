import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Logo, Icon } from './icons.jsx';
import { Loading } from './components.jsx';
import { api } from './api.js';
import Landing from './pages/Landing.jsx';

// Where each role lands after login / on "home".
function homePath(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  return user.role === 'customer' ? '/customer' : '/pro';
}

import Auth from './pages/Auth.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import PostJob from './pages/PostJob.jsx';
import JobDetail from './pages/JobDetail.jsx';
import TradespersonDashboard from './pages/TradespersonDashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import Admin from './pages/Admin.jsx';
import Support from './pages/Support.jsx';
import { Terms, Privacy, Cookies } from './pages/Legal.jsx';

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (_) { /* ignore transient errors */ }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      api.post('/notifications/read-all').catch(() => {});
    }
  }

  function openItem(n) {
    setOpen(false);
    if (!n.read) api.post(`/notifications/${n.id}/read`).catch(() => {});
    if (n.job_id) navigate(`/jobs/${n.job_id}`);
  }

  return (
    <div className="notif" ref={wrapRef}>
      <button className="notif-btn" onClick={toggle} aria-label="Notifications" title="Notifications">
        <Icon name="bell" size={19} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">Notifications</div>
          {items.length === 0 ? (
            <div className="notif-empty">You're all caught up.</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'unread'} ${n.job_id ? 'clickable' : ''}`}
                  onClick={() => openItem(n)}
                >
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="notif-body">{n.body}</div>}
                  <div className="notif-time">{timeAgo(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onDark = !user && location.pathname === '/';
  return (
    <nav className={`nav ${onDark ? 'on-dark' : ''}`}>
      <Link to="/" className="brand">
        <Logo size={30} />
        <span>Trade<span className="accent">Link</span></span>
      </Link>
      <div className="nav-right">
        {user ? (
          <>
            <span className="nav-user">
              <strong>{user.name}</strong> · {user.role === 'customer' ? 'Customer' : user.role === 'admin' ? (user.is_superadmin ? 'Superadmin' : 'Admin') : 'Tradesperson'}
            </span>
            {user.role !== 'admin' && <NotificationsBell />}
            <Link className="btn secondary sm" to={homePath(user)}>
              {user.role === 'admin' ? 'Admin' : 'Dashboard'}
            </Link>
            <button className="btn ghost sm" onClick={() => { logout(); navigate('/'); }}>
              <Icon name="logout" size={16} /> Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn ghost sm" to="/login">Log in</Link>
            <Link className="btn sm" to="/register">Get started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="inner">
        <div>
          <Link to="/" className="brand"><Logo size={26} /> <span>Trade<span className="accent">Link</span></span></Link>
          <p className="tag">Trusted local tradespeople across Zimbabwe.</p>
        </div>
        <div className="cols">
          <div className="col">
            <h4>Platform</h4>
            <Link to="/register">Post a job</Link>
            <Link to="/register">Work with us</Link>
            <Link to="/login">Log in</Link>
          </div>
          <div className="col">
            <h4>Company</h4>
            <Link to="/support">Support</Link>
            <Link to="/support">Contact</Link>
          </div>
          <div className="col">
            <h4>Legal</h4>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
      <div className="legal">
        <span>© {year} TradeLink. All rights reserved.</span>
        <span>Payment is arranged directly between customer and tradesperson.</span>
      </div>
    </footer>
  );
}

function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('tl_cookie_consent')) setShow(true);
  }, []);
  if (!show) return null;
  function decide(v) {
    localStorage.setItem('tl_cookie_consent', v);
    setShow(false);
  }
  return (
    <div className="cookie" role="dialog" aria-label="Cookie notice">
      <p>
        We use essential cookies and local storage to keep you signed in and secure. See our{' '}
        <Link to="/cookies">Cookie Policy</Link> and <Link to="/privacy">Privacy Policy</Link>.
      </p>
      <div className="acts">
        <button className="btn secondary sm" onClick={() => decide('essential')}>Essential only</button>
        <button className="btn sm" onClick={() => decide('all')}>Accept</button>
      </div>
    </div>
  );
}

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={homePath(user)} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={homePath(user)} replace />;
  return <Landing />;
}

export default function App() {
  return (
    <>
      <Nav />
      <div className="app-main">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/customer" element={<Protected role="customer"><CustomerDashboard /></Protected>} />
          <Route path="/post" element={<Protected role="customer"><PostJob /></Protected>} />
          <Route path="/jobs/:id" element={<Protected><JobDetail /></Protected>} />
          <Route path="/pro" element={<Protected role="tradesperson"><TradespersonDashboard /></Protected>} />
          <Route path="/wallet" element={<Protected role="tradesperson"><Wallet /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
      <CookieBanner />
    </>
  );
}
