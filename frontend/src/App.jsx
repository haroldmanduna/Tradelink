import React from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import PostJob from './pages/PostJob.jsx';
import JobDetail from './pages/JobDetail.jsx';
import TradespersonDashboard from './pages/TradespersonDashboard.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <span className="logo">⚒</span>
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
            <button className="btn ghost sm" onClick={() => { logout(); navigate('/'); }}>Log out</button>
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

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'customer' ? '/customer' : '/pro'} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (user) return <Navigate to={user.role === 'customer' ? '/customer' : '/pro'} replace />;
  return <Landing />;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/customer" element={<Protected role="customer"><CustomerDashboard /></Protected>} />
        <Route path="/post" element={<Protected role="customer"><PostJob /></Protected>} />
        <Route path="/jobs/:id" element={<Protected><JobDetail /></Protected>} />
        <Route path="/pro" element={<Protected role="tradesperson"><TradespersonDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
