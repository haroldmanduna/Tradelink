import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LABELS, CATEGORY_ICON } from '../api.js';

export default function Landing() {
  return (
    <div className="container">
      <section className="hero">
        <h1>Trusted local <span className="accent">tradespeople</span>,<br />on your terms.</h1>
        <p>
          Post your job, get offers from verified electricians, plumbers, mechanics and
          handymen across Bulawayo &amp; Zvishavane — then pick the price and rating that suit you.
        </p>
        <div className="hero-actions">
          <Link className="btn" to="/register">Post a job — it's free</Link>
          <Link className="btn secondary" to="/register">Work as a tradesperson</Link>
        </div>
        <div className="cats">
          {Object.keys(CATEGORY_LABELS).map((c) => (
            <span key={c} className="chip">{CATEGORY_ICON[c]} {CATEGORY_LABELS[c]}</span>
          ))}
        </div>
      </section>

      <div className="feature-grid">
        <div className="card feature">
          <div className="fi">📝</div>
          <h3>1. Post your job</h3>
          <p>Describe the work, set your location and a budget you have in mind. Takes a minute.</p>
        </div>
        <div className="card feature">
          <div className="fi">💬</div>
          <h3>2. Compare offers</h3>
          <p>Matching tradespeople accept your budget or send a counter-offer. You see price + rating.</p>
        </div>
        <div className="card feature">
          <div className="fi">⭐</div>
          <h3>3. Hire &amp; rate</h3>
          <p>Pick your tradesperson, get the job done, then leave a rating to help the community.</p>
        </div>
      </div>

      <p className="muted small" style={{ textAlign: 'center', marginTop: 30 }}>
        Payment is arranged directly between you and your tradesperson. No platform fees for v1.
      </p>
    </div>
  );
}
