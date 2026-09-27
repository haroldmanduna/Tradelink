import React from 'react';
import { Icon } from './icons.jsx';
import { ZW_LOCATIONS } from './locations.js';

// A single grouped select of every Zimbabwean city/town, by province.
export function LocationSelect({ value, onChange, id, className = 'select' }) {
  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {ZW_LOCATIONS.map((g) => (
        <optgroup key={g.province} label={g.province}>
          {g.towns.map((t) => <option key={t} value={t}>{t}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="stars" title={value ? `${Number(value).toFixed(1)} / 5` : 'No ratings yet'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" className={`s ${n <= full ? '' : 'empty'}`} size={15} />
      ))}
      {count != null && (
        <span className="rt">{count > 0 ? `${Number(value).toFixed(1)} (${count})` : 'New'}</span>
      )}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={34}
          className={`s ${(hover || value) >= n ? 'on' : ''}`}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const label = status.replace('_', ' ');
  return <span className={`badge ${status}`}>{label}</span>;
}

const ALERT_ICON = { error: 'x', ok: 'check', success: 'check', warn: 'shield', info: 'chat' };
export function Alert({ kind = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`alert ${kind}`}>
      <Icon name={ALERT_ICON[kind] || 'chat'} size={17} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon = 'briefcase', title, children }) {
  return (
    <div className="empty">
      <div className="big"><Icon name={icon} size={26} /></div>
      <div className="t">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export function Loading() {
  return <div className="loading"><div className="spinner" />Loading…</div>;
}

export function StatBar({ items }) {
  return (
    <div className="statbar">
      {items.map((it, i) => (
        <div className="stat" key={i}>
          <div className="v">{it.v}</div>
          <div className="l">{it.l}</div>
        </div>
      ))}
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
