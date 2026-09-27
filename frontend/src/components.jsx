import React from 'react';

export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="stars" title={value ? `${Number(value).toFixed(1)} / 5` : 'No ratings yet'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? '' : 'empty'}>★</span>
      ))}
      {count != null && <span className="muted small" style={{ marginLeft: 6 }}>
        {count > 0 ? `${Number(value).toFixed(1)} (${count})` : 'New'}
      </span>}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={(hover || value) >= n ? 'on' : ''}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          role="radio"
          aria-checked={value === n}
        >★</span>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const label = status.replace('_', ' ');
  return <span className={`badge ${status}`}>{label}</span>;
}

export function Alert({ kind = 'info', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`}>{children}</div>;
}

export function Empty({ icon = '📭', title, children }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

export function money(n) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
