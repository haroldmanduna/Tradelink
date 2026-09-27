import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, TOPUP_METHOD_LABELS } from '../api.js';
import { Alert, Loading, timeAgo } from '../components.jsx';
import { Icon } from '../icons.jsx';

const REASON_LABELS = {
  topup: 'Credits top-up',
  job_fee: 'Job fee',
  welcome: 'Welcome bonus',
  adjustment: 'Adjustment',
};

export default function Wallet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [bundleId, setBundleId] = useState('standard');
  const [method, setMethod] = useState('ecocash');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState(null); // { topup, browserurl, instructions, authorizationcode }
  const [flowMsg, setFlowMsg] = useState('');
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/wallet');
      setData(d);
      if (!d.bundles.find((b) => b.id === bundleId)) setBundleId(d.bundles[0]?.id);
    } catch (e) { setError(e.message); }
  }, [bundleId]);

  useEffect(() => { load(); return () => clearInterval(pollRef.current); }, []); // eslint-disable-line

  function startPolling(topupId) {
    clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await api.get(`/wallet/topup/${topupId}`);
        if (res.topup.credited) {
          clearInterval(pollRef.current);
          setFlowMsg('Payment received — credits added! 🎉');
          setData((d) => (d ? { ...d, balance: res.balance } : d));
          load();
          setTimeout(() => setFlow(null), 2500);
        } else if (['Cancelled', 'Failed', 'Disputed'].includes(res.topup.status)) {
          clearInterval(pollRef.current);
          setFlowMsg('Payment was not completed. You can try again.');
        }
      } catch (_) { /* keep trying */ }
      if (tries >= 40) { clearInterval(pollRef.current); } // ~2 min
    }, 3000);
  }

  async function topup(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFlowMsg('');
    try {
      const body = { bundleId, method };
      if (method !== 'web') body.phone = phone;
      const res = await api.post('/wallet/topup', body);
      setFlow(res);
      if (res.browserurl) {
        window.open(res.browserurl, '_blank', 'noopener');
        setFlowMsg('Complete your payment in the Paynow tab, then come back here — we\u2019ll detect it automatically.');
      } else {
        setFlowMsg('Check your phone and approve the payment prompt. We\u2019ll update this page automatically.');
      }
      startPolling(res.topup.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!data) return error ? <div className="container"><Alert kind="error">{error}</Alert></div> : <Loading />;

  const selected = data.bundles.find((b) => b.id === bundleId);
  const mobile = method !== 'web';

  return (
    <div className="container container-narrow">
      <Link to="/pro" className="back-link"><Icon name="arrowLeft" size={16} /> Back to dashboard</Link>
      <h1 className="h1 flex" style={{ gap: 10 }}>
        <span className="job-icon" style={{ width: 40, height: 40 }}><Icon name="wallet" size={22} /></span>
        Credits wallet
      </h1>

      {/* Balance */}
      <div className="wallet-balance">
        <div>
          <span className="wb-label">Your balance</span>
          <span className="wb-value"><Icon name="coins" size={26} /> {data.balance} <em>credits</em></span>
        </div>
      </div>

      {!data.billingEnabled && (
        <Alert kind="success">
          <strong>Launch offer:</strong> TradeLink is <strong>free right now</strong> — you don&rsquo;t need credits to
          send offers or win jobs. Top up any time to be ready for when fees begin (we&rsquo;ll give plenty of notice).
        </Alert>
      )}

      {!data.paynowConfigured && (
        <Alert kind="warn">Top-ups aren&rsquo;t switched on yet. Check back shortly.</Alert>
      )}

      {error && <Alert kind="error">{error}</Alert>}

      {/* Active payment flow */}
      {flow ? (
        <div className="card pay-flow">
          <h3 className="h3">Finishing your top-up</h3>
          {flowMsg && <p className="sub">{flowMsg}</p>}
          {flow.authorizationcode && (
            <p className="sub">InnBucks authorization code: <strong>{flow.authorizationcode}</strong></p>
          )}
          {flow.browserurl && (
            <a className="btn secondary sm" href={flow.browserurl} target="_blank" rel="noopener">
              Re-open Paynow payment
            </a>
          )}
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn ghost sm" onClick={() => { clearInterval(pollRef.current); setFlow(null); setFlowMsg(''); }}>
              Close
            </button>
            <span className="sub flex" style={{ gap: 6, alignItems: 'center' }}>
              <span className="spinner-dot" /> Waiting for confirmation&hellip;
            </span>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={topup}>
          <h3 className="h3">Buy credits</h3>
          <div className="bundle-grid">
            {data.bundles.map((b) => (
              <label key={b.id} className={`bundle ${bundleId === b.id ? 'sel' : ''}`}>
                <input type="radio" name="bundle" value={b.id} checked={bundleId === b.id}
                  onChange={() => setBundleId(b.id)} />
                <span className="b-credits">{b.credits}</span>
                <span className="b-unit">credits</span>
                <span className="b-price">${b.usd}</span>
                {b.bonus && <span className="b-bonus">{b.bonus}</span>}
              </label>
            ))}
          </div>

          <label className="field-label">Pay with</label>
          <div className="method-row">
            {data.methods.map((m) => (
              <button type="button" key={m}
                className={`chip ${method === m ? 'active' : ''}`}
                onClick={() => setMethod(m)}>
                {TOPUP_METHOD_LABELS[m] || m}
              </button>
            ))}
          </div>

          {mobile && (
            <div style={{ marginTop: 12 }}>
              <label className="field-label">Mobile number</label>
              <input className="input" inputMode="numeric" placeholder="0771234567"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
              <p className="hint">You&rsquo;ll get a prompt on this number to approve the payment.</p>
            </div>
          )}

          <button className="btn" type="submit" disabled={busy || !data.paynowConfigured} style={{ marginTop: 16, width: '100%' }}>
            {busy ? 'Starting…' : `Top up ${selected ? selected.credits : ''} credits · $${selected ? selected.usd : ''}`}
          </button>
          <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
            Secure payment by Paynow · EcoCash, OneMoney, InnBucks &amp; bank cards.
          </p>
        </form>
      )}

      {/* History */}
      <h3 className="h3" style={{ marginTop: 28 }}>History</h3>
      {data.ledger.length === 0 ? (
        <p className="sub">No transactions yet.</p>
      ) : (
        <ul className="ledger">
          {data.ledger.map((l, i) => (
            <li key={i} className="ledger-row">
              <span className="lr-reason">{REASON_LABELS[l.reason] || l.reason}</span>
              <span className={`lr-delta ${l.delta >= 0 ? 'pos' : 'neg'}`}>
                {l.delta >= 0 ? '+' : ''}{l.delta}
              </span>
              <span className="lr-bal">{l.balanceAfter} cr</span>
              <span className="lr-time">{timeAgo(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
