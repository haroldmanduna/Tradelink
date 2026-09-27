import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS } from '../api.js';
import { TradeIcon, Icon } from '../icons.jsx';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow"><span className="dot" /> Now serving Bulawayo &amp; Zvishavane</span>
          <h1>Trusted local <span className="accent">tradespeople</span>, on your terms.</h1>
          <p className="lead">
            Post a job, get real offers from verified electricians, plumbers, mechanics and
            handymen — then choose the price and rating that suit you. No middlemen, no markups.
          </p>
          <div className="hero-actions">
            <button className="btn lg" onClick={() => navigate('/register')}>
              Post a job — it's free <Icon name="arrowRight" size={18} />
            </button>
            <button className="btn secondary lg" onClick={() => navigate('/register')}>
              Work as a tradesperson
            </button>
          </div>
          <div className="hero-trust">
            <span><b>8</b> trades covered</span>
            <span><b>0%</b> platform fees in v1</span>
            <span><b>Direct</b> customer contact</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="k">What we cover</div>
          <h2>Every trade you need at home</h2>
          <p>Pick a category and get matched with skilled people nearby.</p>
        </div>
        <div className="cat-grid">
          {Object.keys(CATEGORY_LABELS).map((c) => (
            <div key={c} className="cat-tile" onClick={() => navigate('/register')}>
              <div className="ic"><TradeIcon name={c} size={24} /></div>
              <div className="nm">{CATEGORY_LABELS[c]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="k">How it works</div>
          <h2>From posted to done in three steps</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="n">STEP 01</div>
            <div className="ic"><Icon name="doc" size={22} /></div>
            <h3>Post your job</h3>
            <p>Describe the work, set your location and a budget you have in mind. Takes about a minute.</p>
          </div>
          <div className="step">
            <div className="n">STEP 02</div>
            <div className="ic"><Icon name="chat" size={22} /></div>
            <h3>Compare offers</h3>
            <p>Matching tradespeople accept your budget or send a counter-offer. You see every price and rating.</p>
          </div>
          <div className="step">
            <div className="n">STEP 03</div>
            <div className="ic"><Icon name="star" size={22} /></div>
            <h3>Hire &amp; rate</h3>
            <p>Pick your tradesperson, get the job done, then leave a rating to help the whole community.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="cta-band">
          <h2>Got a job that needs doing?</h2>
          <p>Post it now and start receiving offers from local pros today.</p>
          <div className="hero-actions">
            <button className="btn lg" onClick={() => navigate('/register')}>Get started</button>
            <button className="btn secondary lg" onClick={() => navigate('/login')}
              style={{ background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>
              I already have an account
            </button>
          </div>
        </div>
      </section>

      <div className="foot">
        TradeLink · Payment is arranged directly between customer and tradesperson · v1
      </div>
    </div>
  );
}
