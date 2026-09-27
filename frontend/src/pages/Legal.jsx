import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';

const UPDATED = '27 September 2026';

function Layout({ title, children }) {
  return (
    <div className="container">
      <div className="prose">
        <Link to="/" className="small flex" style={{ display: 'inline-flex', width: 'auto', marginBottom: 14 }}>
          <Icon name="arrowLeft" size={15} /> Back to home
        </Link>
        <div className="card">
          <h1>{title}</h1>
          <div className="updated">Last updated: {UPDATED}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <Layout title="Terms & Conditions">
      <p>Welcome to TradeLink. These Terms &amp; Conditions ("Terms") govern your use of the TradeLink
        platform ("Platform"), which connects customers with independent tradespeople across
        Zimbabwe. By creating an account or using the Platform, you agree to these Terms.</p>

      <h2>1. What TradeLink is</h2>
      <p>TradeLink is a marketplace that helps customers post jobs and receive offers from tradespeople.
        TradeLink is <strong>not</strong> a party to any agreement between a customer and a tradesperson. We do
        not employ tradespeople, do not perform the work, and do not guarantee the quality, safety or
        legality of any job. Tradespeople are independent contractors.</p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information (name, phone, email and location) and keep it current.</li>
        <li>You are responsible for activity under your account and for keeping your password secure.</li>
        <li>You must be at least 18 years old to use the Platform.</li>
      </ul>

      <h2>3. Jobs, offers and matching</h2>
      <ul>
        <li>Customers post jobs with a category, description, location and proposed budget.</li>
        <li>Tradespeople may accept the budget or submit a counter-offer. Customers choose which offer to accept.</li>
        <li>Once an offer is accepted, the job is "matched" and contact details are shared so the parties can arrange the work.</li>
      </ul>

      <h2>4. Payments</h2>
      <p>In this version of TradeLink, <strong>no payments are processed on the Platform</strong>. All payment
        is arranged and made directly between the customer and the tradesperson. Any commission or service
        fee arrangement will be communicated to you and, where introduced, will be governed by an updated
        version of these Terms.</p>

      <h2>5. Ratings and conduct</h2>
      <ul>
        <li>Customers may rate and review tradespeople after a job is completed. Reviews must be honest and lawful.</li>
        <li>You agree not to post false, abusive, misleading or unlawful content, and not to circumvent, defraud or misuse the Platform.</li>
        <li>We may suspend or remove accounts that breach these Terms.</li>
      </ul>

      <h2>6. Disclaimers &amp; liability</h2>
      <p>The Platform is provided "as is". To the maximum extent permitted by law, TradeLink is not liable
        for the acts or omissions of any customer or tradesperson, for the quality or outcome of any job, or
        for any loss arising from arrangements made through the Platform. You use the Platform at your own risk
        and are responsible for verifying credentials and agreeing scope, price and safety with the other party.</p>

      <h2>7. Changes</h2>
      <p>We may update these Terms from time to time. Continued use of the Platform after changes take effect
        constitutes acceptance of the revised Terms.</p>

      <h2>8. Contact</h2>
      <p>Questions about these Terms? Reach us via the <Link to="/support">Support</Link> page.</p>
    </Layout>
  );
}

export function Privacy() {
  return (
    <Layout title="Privacy Policy">
      <p>This Privacy Policy explains what personal information TradeLink collects, how we use it, and your
        rights. It applies to everyone who uses the Platform in Zimbabwe.</p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email, phone number, location, role (customer or tradesperson), and password (stored only as a secure hash).</li>
        <li><strong>Tradesperson profile:</strong> trade category, skills, bio, ratings and completed-job counts.</li>
        <li><strong>Activity data:</strong> jobs you post, offers you make or receive, messages/notes, and ratings.</li>
        <li><strong>Technical data:</strong> limited log data and cookies needed to keep you signed in and secure.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To operate the marketplace — matching jobs with tradespeople and showing offers and ratings.</li>
        <li>To share contact details between a customer and a tradesperson once an offer is accepted, so the work can be arranged.</li>
        <li>To keep the Platform secure, prevent abuse, and respond to support requests.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>We do not sell your personal data. Your name, ratings and (after matching) contact details are shared
        with the other party to a job so it can be carried out. We may disclose information where required by law.</p>

      <h2>4. Data retention &amp; security</h2>
      <p>We keep your information for as long as your account is active or as needed to provide the service.
        Passwords are hashed, access to the platform is rate-limited, and data is transmitted over encrypted
        connections. No system is perfectly secure, so we cannot guarantee absolute security.</p>

      <h2>5. Your rights</h2>
      <ul>
        <li>You may access, correct or update your profile information at any time from your dashboard.</li>
        <li>You may request deletion of your account by contacting Support.</li>
      </ul>

      <h2>6. Contact</h2>
      <p>For privacy questions or requests, use the <Link to="/support">Support</Link> page.</p>
    </Layout>
  );
}

export function Cookies() {
  return (
    <Layout title="Cookie Policy">
      <p>This Cookie Policy explains how TradeLink uses cookies and similar local-storage technologies.</p>

      <h2>1. What we use</h2>
      <ul>
        <li><strong>Essential storage:</strong> we store a secure sign-in token in your browser's local storage so you
          stay logged in. Without it, the Platform cannot keep you authenticated.</li>
        <li><strong>Preferences:</strong> we remember that you have acknowledged this cookie notice so we don't show it again.</li>
      </ul>

      <h2>2. What we do not use</h2>
      <p>TradeLink v1 does not use third-party advertising cookies or cross-site tracking. We do not sell your data.</p>

      <h2>3. Managing cookies</h2>
      <p>You can clear cookies and local storage at any time through your browser settings. Doing so will sign you
        out and reset your preferences. Blocking essential storage may prevent parts of the Platform from working.</p>

      <h2>4. Contact</h2>
      <p>Questions? Visit the <Link to="/support">Support</Link> page.</p>
    </Layout>
  );
}
