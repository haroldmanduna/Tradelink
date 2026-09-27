import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Logo, Icon } from './icons.jsx';
import { Loading } from './components.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import PostJob from './pages/PostJob.jsx';
import JobDetail from './pages/JobDetail.jsx';
import TradespersonDashboard from './pages/TradespersonDashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import Support from './pages/Support.jsx';
import { Terms, Privacy, Cookies } from './pages/Legal.jsx';

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
              <strong>{user.name}</strong> · {user.role === 'customer' ? 'Customer' : 'Tradesperson'}
            </span>
            <Link className="btn secondary sm" to={user.role === 'customer' ? '/customer' : '/pro'}>
              Dashboard
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
    return <Navigate to={user.role === 'customer' ? '/customer' : '/pro'} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={user.role === 'customer' ? '/customer' : '/pro'} replace />;
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
