import React from 'react';

// Monoline SVG icon set — drawn with currentColor so they inherit text color.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const TRADE_PATHS = {
  electrician: (
    <>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" {...S} />
    </>
  ),
  plumber: (
    <>
      <path d="M7 3v4a3 3 0 0 0 3 3h1v4" {...S} />
      <path d="M11 14h3a3 3 0 0 1 3 3v4" {...S} />
      <rect x="4" y="2" width="6" height="3" rx="1" {...S} />
      <rect x="14" y="19" width="6" height="3" rx="1" {...S} />
    </>
  ),
  mechanic: (
    <>
      <circle cx="12" cy="12" r="3.2" {...S} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" {...S} />
    </>
  ),
  handyman: (
    <>
      <path d="M14.5 5.5a3.5 3.5 0 0 0-4.9 4.4L4 15.5 6.5 18l5.6-5.6a3.5 3.5 0 0 0 4.4-4.9l-2.2 2.2-2-2 2.2-2.2Z" {...S} />
      <path d="m15 14 4.5 4.5a1.8 1.8 0 0 1-2.5 2.5L12.5 16.5" {...S} />
    </>
  ),
  carpenter: (
    <>
      <path d="M3 7h13l4 4-9 9-4-4V7Z" {...S} />
      <path d="M3 7 7 3M8 12l3 3" {...S} />
    </>
  ),
  painter: (
    <>
      <rect x="3" y="4" width="13" height="5" rx="1" {...S} />
      <path d="M16 6h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-6v3" {...S} />
      <rect x="10" y="15" width="4" height="6" rx="1" {...S} />
    </>
  ),
  welder: (
    <>
      <path d="M12 3c1.8 2.4 3 4.3 3 6.4A3 3 0 0 1 9 9.4C9 7.3 10.2 5.4 12 3Z" {...S} />
      <path d="M8 15c1 1.3 2.4 2 4 2s3-.7 4-2M6.5 19c1.6 1.3 3.5 2 5.5 2s3.9-.7 5.5-2" {...S} />
    </>
  ),
  builder: (
    <>
      <path d="M3 21V10l9-6 9 6v11" {...S} />
      <path d="M3 13h18M9 13v8M15 13v8M3 17h18" {...S} />
    </>
  ),
};

export function TradeIcon({ name, size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {TRADE_PATHS[name] || TRADE_PATHS.handyman}
    </svg>
  );
}

// UI glyphs
export function Icon({ name, size = 18, className, style, ...rest }) {
  const p = {
    check: <path d="m4 12 5 5L20 6" {...S} />,
    star: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3Z" {...S} />,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" {...S} />,
    arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" {...S} />,
    shield: <><path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z" {...S} /><path d="m9 12 2 2 4-4" {...S} /></>,
    phone: <path d="M6 3h3l1.5 5-2 1.5a12 12 0 0 0 6 6l1.5-2 5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" {...S} />,
    plus: <path d="M12 5v14M5 12h14" {...S} />,
    pin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" {...S} /><circle cx="12" cy="10" r="2.5" {...S} /></>,
    clock: <><circle cx="12" cy="12" r="9" {...S} /><path d="M12 7v5l3 2" {...S} /></>,
    chat: <path d="M4 5h16v11H8l-4 4V5Z" {...S} />,
    doc: <><path d="M6 3h8l4 4v14H6V3Z" {...S} /><path d="M14 3v4h4M9 13h6M9 17h4" {...S} /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" {...S} /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" {...S} /></>,
    play: <path d="M7 5l12 7-12 7V5Z" {...S} />,
    x: <path d="M6 6l12 12M18 6 6 18" {...S} />,
    logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12h9M16 8l4 4-4 4" {...S} />,
    search: <><circle cx="11" cy="11" r="7" {...S} /><path d="m20 20-3.5-3.5" {...S} /></>,
    handshake: <path d="M3 10l4-4 3 2 3-2 4 4v5l-4 3-3-3-3 3-4-3v-5Z" {...S} />,
    verified: <><path d="m12 3 2.2 1.6 2.7-.2 1 2.5 2.4 1.2-.6 2.6 1.1 2.5-1.9 2 .2 2.7-2.7.5-1.5 2.3-2.5-1-2.5 1-1.5-2.3-2.7-.5.2-2.7-1.9-2 1.1-2.5-.6-2.6 2.4-1.2 1-2.5 2.7.2L12 3Z" {...S} /><path d="m9 12 2 2 4-4" {...S} /></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...rest}>
      {p}
    </svg>
  );
}

export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#tlg)" />
      <path d="M10 9.5 9 22M10 9.5l4 4M22 9.5 23 22M22 9.5l-4 4M13.5 13.5h5M12.5 22h7"
        fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="tlg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#F0510E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
