import React, { useEffect, useState, useCallback } from 'react';
import { api, tradeLabel, CATEGORY_LABELS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Icon } from '../icons.jsx';
import { Stars, Alert, Loading, Empty, money, timeAgo } from '../components.jsx';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'chart' },
  { id: 'users',      label: 'Users',      icon: 'users' },
  { id: 'jobs',       label: 'Jobs',       icon: 'briefcase' },
  { id: 'reviews',    label: 'Reviews',    icon: 'star' },
  { id: 'complaints', label: 'Complaints', icon: 'flag' },
  { id: 'activity',   label: 'Activity',   icon: 'clock' },
];

const ROLE_LABEL = { customer: 'Customer', tradesperson: 'Tradesperson', admin: 'Admin' };

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [showPw, setShowPw] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const isSuper = !!(user && user.is_superadmin);

  return (
    <div className="container admin">
      <div className="admin-head">
        <div>
          <div className="eyebrow"><Icon name="shield" size={14} /> Admin console</div>
          <h1 className="h1">Control center</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Signed in as <strong>{user.name}</strong>
            {isSuper
              ? <span className="badge verified" style={{ marginLeft: 8 }}><Icon name="key" size={12} /> Superadmin</span>
              : <span className="badge open" style={{ marginLeft: 8 }}>Admin</span>}
          </p>
        </div>
        <div className="admin-head-actions">
          {isSuper && (
            <button className="btn" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={16} /> Add admin
            </button>
          )}
          <button className="btn ghost sm" onClick={() => setShowPw((s) => !s)}>
            <Icon name="key" size={15} /> Change password
          </button>
        </div>
      </div>

      {showPw && <ChangePassword onDone={() => setShowPw(false)} />}
      {showAdd && <AddAdmin onClose={() => setShowAdd(false)} />}

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{t.label}
          </div>
        ))}
      </div>

      {tab === 'overview'   && <Overview />}
      {tab === 'users'      && <Users isSuper={isSuper} meId={user.id} />}
      {tab === 'jobs'       && <Jobs />}
      {tab === 'reviews'    && <Reviews />}
      {tab === 'complaints' && <Complaints />}
      {tab === 'activity'   && <Activity />}
    </div>
  );
}

/* ------------------------------------------------------------- Add admin -- */
function AddAdmin({ onClose }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { admin } = await api.post('/admin/admins', f);
      setCreated({ login: admin.email || admin.phone, password: f.password, name: admin.name });
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {created ? (
          <>
            <h3 className="modal-title">Admin created ✓</h3>
            <p className="muted modal-body">Give <strong>{created.name}</strong> these details — they can log in right away at the same site.</p>
            <div className="cred-box">
              <div><span>Login</span><strong>{created.login}</strong></div>
              <div><span>Password</span><strong>{created.password}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3 className="modal-title">Add a new admin</h3>
            <p className="muted modal-body">Set their login and password here. They sign in at the normal login page and land straight on the admin console.</p>
            {err && <Alert kind="error">{err}</Alert>}
            <input className="input" placeholder="Full name" value={f.name} onChange={(e) => up('name', e.target.value)} autoFocus />
            <input className="input" type="email" placeholder="Email (used to log in)" value={f.email} onChange={(e) => up('email', e.target.value)} />
            <input className="input" placeholder="Phone (optional)" value={f.phone} onChange={(e) => up('phone', e.target.value)} />
            <input className="input" placeholder="Password (min 8 characters)" value={f.password} onChange={(e) => up('password', e.target.value)} />
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Change password */
function ChangePassword({ onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.post('/admin/change-password', { current, next });
      setOk(true); setCurrent(''); setNext('');
      setTimeout(onDone, 1200);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }
  return (
    <form className="card pw-card" onSubmit={submit}>
      {ok && <Alert kind="success">Password updated.</Alert>}
      {err && <Alert kind="error">{err}</Alert>}
      <div className="pw-fields">
        <input className="input" type="password" placeholder="Current password"
          value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input className="input" type="password" placeholder="New password (min 8 chars)"
          value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update'}</button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- Overview */
function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/admin/overview').then(setD).catch((e) => setErr(e.message));
  }, []);
  if (err) return <Alert kind="error">{err}</Alert>;
  if (!d) return <Loading />;

  const group = (title, icon, items) => (
    <div className="card admin-metric">
      <div className="am-title"><Icon name={icon} size={16} /> {title}</div>
      <div className="am-grid">
        {items.map((it, i) => (
          <div className="am-cell" key={i}>
            <div className="am-v" style={it.tone ? { color: `var(--${it.tone})` } : null}>{it.v}</div>
            <div className="am-l">{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-metrics">
      {group('People', 'users', [
        { v: d.users.total, l: 'Total users' },
        { v: d.users.customers, l: 'Customers' },
        { v: d.users.tradespeople, l: 'Tradespeople' },
        { v: d.users.admins, l: 'Admins' },
        { v: d.users.suspended, l: 'Suspended', tone: d.users.suspended ? 'danger' : null },
      ])}
      {group('Jobs', 'briefcase', [
        { v: d.jobs.total, l: 'Total jobs' },
        { v: d.jobs.open, l: 'Open' },
        { v: d.jobs.active, l: 'Active' },
        { v: d.jobs.completed, l: 'Completed', tone: 'ok' },
        { v: d.jobs.cancelled, l: 'Cancelled' },
        { v: money(d.jobs.completed_value), l: 'Completed value' },
      ])}
      {group('Marketplace', 'handshake', [
        { v: d.offers.total, l: 'Offers made' },
        { v: d.offers.accepted, l: 'Accepted' },
        { v: d.ratings.total, l: 'Reviews' },
        { v: d.ratings.avg ? d.ratings.avg.toFixed(2) : '—', l: 'Avg rating', tone: 'gold' },
      ])}
      {group('Support & revenue', 'flag', [
        { v: d.support.total, l: 'Complaints' },
        { v: d.support.new, l: 'New', tone: d.support.new ? 'brand' : null },
        { v: d.support.resolved, l: 'Resolved', tone: 'ok' },
        { v: d.topups.paid, l: 'Paid top-ups' },
        { v: money(d.topups.revenue), l: 'Revenue' },
      ])}
    </div>
  );
}

/* ------------------------------------------------------------------- Users */
function Users({ isSuper, meId }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(0);
  const [pending, setPending] = useState(null);   // { user, action } for the modal

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('search', search.trim());
    if (role) qs.set('role', role);
    if (status) qs.set('status', status);
    setRows(null);
    api.get('/admin/users?' + qs.toString())
      .then((d) => setRows(d.users)).catch((e) => setErr(e.message));
  }, [search, role, status]);

  useEffect(() => { load(); }, [role, status]);          // eslint-disable-line
  useEffect(() => {                                       // debounce search
    const t = setTimeout(load, 300); return () => clearTimeout(t);
  }, [search]);                                           // eslint-disable-line

  // Confirmed from the in-app modal (reliable everywhere, unlike window.confirm).
  async function runAction(reason) {
    const { user: u, action } = pending;
    setBusy(u.id); setErr(''); setMsg('');
    try {
      await api.post(`/admin/users/${u.id}/${action}`, action === 'suspend' ? { reason } : undefined);
      const done = { suspend: 'suspended', unsuspend: 'un-suspended', 'make-admin': 'is now an admin', 'revoke-admin': 'is no longer an admin' }[action];
      setMsg(`${u.name} ${done}.`);
      setPending(null);
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(0); }
  }

  const chip = (v, cur, set, label) => (
    <div className={`chip ${cur === v ? 'active' : ''}`} onClick={() => set(cur === v ? '' : v)}>{label}</div>
  );

  return (
    <div>
      <div className="admin-filters">
        <div className="admin-search">
          <Icon name="search" size={16} />
          <input className="input" placeholder="Search name, email or phone…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="chips-row">
          {chip('customer', role, setRole, 'Customers')}
          {chip('tradesperson', role, setRole, 'Tradespeople')}
          {isSuper && chip('admin', role, setRole, 'Admins')}
          <span className="chips-sep" />
          {chip('active', status, setStatus, 'Active')}
          {chip('suspended', status, setStatus, 'Suspended')}
        </div>
      </div>

      {msg && <Alert kind="success">{msg}</Alert>}
      {err && <Alert kind="error">{err}</Alert>}

      {!rows ? <Loading /> : rows.length === 0 ? (
        <Empty icon="users" title="No users match">Try a different search or filter.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Location</th><th>Activity</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={u.suspended ? 'is-suspended' : ''}>
                  <td>
                    <div className="u-name">
                      {u.name}
                      {u.is_superadmin && <span className="badge verified" title="Superadmin"><Icon name="key" size={11} /></span>}
                    </div>
                    <div className="u-sub">{u.email || '—'} · {u.phone || 'no phone'}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'open' : u.role === 'tradesperson' ? 'matched' : 'in_progress'}`}>
                      {u.is_superadmin ? 'Superadmin' : ROLE_LABEL[u.role]}
                    </span>
                    {u.role === 'tradesperson' && u.category &&
                      <div className="u-sub">{tradeLabel(u.category)}{u.verified ? ' · verified' : ''}</div>}
                  </td>
                  <td>{u.location}</td>
                  <td>
                    {u.role === 'tradesperson' ? (
                      <span className="u-sub">
                        {u.rating_count > 0 ? `${Number(u.rating).toFixed(1)}★ (${u.rating_count})` : 'No reviews'} · {u.offers_made} offers · {u.jobs_done} done
                      </span>
                    ) : u.role === 'customer' ? (
                      <span className="u-sub">{u.jobs_posted} jobs posted</span>
                    ) : <span className="u-sub">—</span>}
                  </td>
                  <td>
                    {u.suspended
                      ? <span className="badge cancelled" title={u.suspended_reason || ''}>Suspended</span>
                      : <span className="badge completed">Active</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      {u.is_superadmin ? (
                        <span className="u-sub locked"><Icon name="shield" size={13} /> Protected</span>
                      ) : (
                        <>
                          {u.suspended
                            ? <button className="btn secondary sm" disabled={busy === u.id} onClick={() => setPending({ user: u, action: 'unsuspend' })}>Unsuspend</button>
                            : <button className="btn danger sm" disabled={busy === u.id} onClick={() => setPending({ user: u, action: 'suspend' })}><Icon name="ban" size={14} /> Suspend</button>}
                          {isSuper && u.role !== 'admin' && u.id !== meId &&
                            <button className="btn ghost sm" disabled={busy === u.id} onClick={() => setPending({ user: u, action: 'make-admin' })}>Make admin</button>}
                          {isSuper && u.role === 'admin' &&
                            <button className="btn ghost sm" disabled={busy === u.id} onClick={() => setPending({ user: u, action: 'revoke-admin' })}>Remove admin</button>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal pending={pending} busy={!!busy}
        onCancel={() => setPending(null)} onConfirm={runAction} />
    </div>
  );
}

/* ------------------------------------------------------- Confirmation modal */
function ConfirmModal({ pending, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [pending]);
  if (!pending) return null;
  const { user: u, action } = pending;
  const meta = {
    suspend:        { title: `Suspend ${u.name}?`,          body: 'They will be signed out and blocked from using Trustade until you un-suspend them.', cta: 'Suspend',      danger: true, reason: true },
    unsuspend:      { title: `Un-suspend ${u.name}?`,       body: 'They will be able to log in and use Trustade again.',                                cta: 'Un-suspend' },
    'make-admin':   { title: `Make ${u.name} an admin?`,    body: 'They will get access to the admin console and can manage users and complaints.',       cta: 'Make admin' },
    'revoke-admin': { title: `Remove admin from ${u.name}?`,body: 'They will lose admin access and return to a normal account.',                          cta: 'Remove admin', danger: true },
  }[action];
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-title">{meta.title}</h3>
        <p className="muted modal-body">{meta.body}</p>
        {meta.reason && (
          <textarea className="textarea" rows={3} value={reason} autoFocus
            placeholder="Reason (optional — saved to the audit log)"
            onChange={(e) => setReason(e.target.value)} />
        )}
        <div className="modal-actions">
          <button className="btn secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${meta.danger ? 'danger' : ''}`} disabled={busy}
            onClick={() => onConfirm(reason)}>{busy ? 'Working…' : meta.cta}</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Jobs */
function Jobs() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('all');
  useEffect(() => {
    setRows(null);
    api.get('/admin/jobs?status=' + status).then((d) => setRows(d.jobs)).catch((e) => setErr(e.message));
  }, [status]);

  const FILTERS = ['all', 'open', 'matched', 'in_progress', 'completed', 'cancelled'];
  if (err) return <Alert kind="error">{err}</Alert>;
  return (
    <div>
      <div className="chips-row" style={{ marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <div key={f} className={`chip ${status === f ? 'active' : ''}`} onClick={() => setStatus(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </div>
        ))}
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? (
        <Empty icon="briefcase" title="No jobs here yet" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Trade</th><th>Customer</th><th>Tradesperson</th><th>Budget</th><th>Offers</th><th>Status</th><th>Posted</th></tr></thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id}>
                  <td className="u-sub">{j.id}</td>
                  <td>
                    <div className="u-name">{tradeLabel(j.category, j.custom_category)}</div>
                    <div className="u-sub">{j.location}</div>
                  </td>
                  <td>{j.customer_name}</td>
                  <td>{j.pro_name || <span className="u-sub">—</span>}</td>
                  <td>{money(j.budget)}</td>
                  <td>{j.offer_count}</td>
                  <td><span className={`badge ${j.status}`}>{j.status.replace('_', ' ')}</span></td>
                  <td className="u-sub">{timeAgo(j.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Reviews */
function Reviews() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/admin/reviews').then((d) => setRows(d.reviews)).catch((e) => setErr(e.message));
  }, []);
  if (err) return <Alert kind="error">{err}</Alert>;
  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty icon="star" title="No reviews yet" />;
  return (
    <div className="admin-cards">
      {rows.map((r) => (
        <div className="card admin-review" key={r.id}>
          <div className="ar-top">
            <Stars value={r.rating} />
            <span className="u-sub">{timeAgo(r.created_at)}</span>
          </div>
          {r.comment ? <p className="ar-comment">“{r.comment}”</p> : <p className="u-sub ar-comment">No comment left.</p>}
          <div className="ar-meta">
            <span><strong>{r.customer_name}</strong> rated <strong>{r.pro_name}</strong></span>
            <span className="u-sub"> · {tradeLabel(r.category, r.custom_category)} · job #{r.job_id}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Complaints */
function Complaints() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const load = useCallback(() => {
    setRows(null);
    api.get('/admin/complaints?status=' + filter).then((d) => setRows(d.complaints)).catch((e) => setErr(e.message));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    try { await api.patch('/admin/complaints/' + id, { status }); load(); }
    catch (e) { setErr(e.message); }
  }
  const FILTERS = ['all', 'new', 'open', 'resolved'];
  if (err) return <Alert kind="error">{err}</Alert>;
  return (
    <div>
      <div className="chips-row" style={{ marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <div key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
          </div>
        ))}
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? (
        <Empty icon="flag" title="No complaints" >Nothing in the inbox for this filter.</Empty>
      ) : (
        <div className="admin-cards">
          {rows.map((c) => (
            <div className="card admin-complaint" key={c.id}>
              <div className="ac-top">
                <div>
                  <span className="ac-subject">{c.subject}</span>
                  <span className={`badge ${c.status === 'new' ? 'open' : c.status === 'resolved' ? 'completed' : 'matched'}`} style={{ marginLeft: 8 }}>{c.status}</span>
                </div>
                <span className="u-sub">{timeAgo(c.created_at)}</span>
              </div>
              <p className="ac-msg">{c.message}</p>
              <div className="ac-foot">
                <span className="u-sub">
                  {c.name} · {c.email}{c.user_role ? ` · ${ROLE_LABEL[c.user_role]}` : ' · guest'}
                </span>
                <div className="row-actions">
                  {c.status !== 'open' && <button className="btn ghost sm" onClick={() => setStatus(c.id, 'open')}>Mark open</button>}
                  {c.status !== 'resolved' && <button className="btn secondary sm" onClick={() => setStatus(c.id, 'resolved')}>Resolve</button>}
                  {c.status === 'resolved' && <button className="btn ghost sm" onClick={() => setStatus(c.id, 'new')}>Reopen</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Activity */
function Activity() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/admin/actions').then((d) => setRows(d.actions)).catch((e) => setErr(e.message));
  }, []);
  const VERB = {
    suspend: 'suspended', unsuspend: 'un-suspended',
    grant_admin: 'made admin', revoke_admin: 'removed admin from',
    support_status: 'updated complaint',
  };
  if (err) return <Alert kind="error">{err}</Alert>;
  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty icon="clock" title="No admin activity yet" >Suspensions and role changes are logged here.</Empty>;
  return (
    <div className="admin-log">
      {rows.map((a) => (
        <div className="log-row" key={a.id}>
          <div className="log-icon"><Icon name={a.action.includes('admin') ? 'key' : a.action === 'suspend' ? 'ban' : 'check'} size={15} /></div>
          <div className="log-body">
            <div>
              <strong>{a.admin_name || 'Admin'}</strong> {VERB[a.action] || a.action}
              {a.target_name && <> <strong>{a.target_name}</strong></>}
              {a.detail && <span className="u-sub"> — {a.detail}</span>}
            </div>
            <div className="u-sub">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
