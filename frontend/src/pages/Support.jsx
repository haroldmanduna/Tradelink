import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert } from '../components.jsx';
import { Icon } from '../icons.jsx';

const FAQS = [
  { q: 'How much does TradeLink cost?', a: 'Posting a job and receiving offers is free in v1. Payment for the work itself is arranged directly between you and the tradesperson.' },
  { q: 'How do I get paid / pay?', a: 'Payment happens off-platform for now — cash, bank transfer or mobile money, agreed directly between the customer and tradesperson once an offer is accepted.' },
  { q: 'What if a tradesperson does poor work?', a: 'Rate the tradesperson honestly after completion. Ratings help the whole community choose well. You can also contact us below.' },
  { q: 'How do I become verified?', a: 'Verification is granted by the TradeLink team. Complete jobs and build up genuine ratings, then reach out via this form.' },
];

export default function Support() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/support', form);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <Link to="/" className="small flex" style={{ display: 'inline-flex', width: 'auto', marginBottom: 14 }}>
        <Icon name="arrowLeft" size={15} /> Back to home
      </Link>
      <h1 className="h1">Support</h1>
      <p className="sub">Need a hand? Check the common questions below or send us a message.</p>

      <div className="grid cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Frequently asked</h3>
          {FAQS.map((f, i) => (
            <details key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--line)' : 'none', padding: '12px 0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Contact us</h3>
          {sent ? (
            <Alert kind="ok">Thanks — your message has been received. We'll get back to you by email.</Alert>
          ) : (
            <form onSubmit={submit}>
              <Alert kind="error">{error}</Alert>
              <div className="row">
                <div className="field">
                  <label>Your name</label>
                  <input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label>Subject</label>
                <input className="input" value={form.subject} onChange={(e) => upd('subject', e.target.value)} placeholder="What's this about?" required />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea className="textarea" value={form.message} onChange={(e) => upd('message', e.target.value)} required />
              </div>
              <button className="btn block" disabled={busy} type="submit">
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
