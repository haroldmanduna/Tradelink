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
  tiler: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" {...S} />
      <path d="M4 10h16M4 15h16M9.5 4v16M14.5 4v16" {...S} />
    </>
  ),
  roofer: (
    <>
      <path d="M2 12 12 5l10 7" {...S} />
      <path d="M4.5 11 12 6.5 19.5 11" {...S} />
      <path d="M6 13v6h12v-6" {...S} />
    </>
  ),
  plasterer: (
    <>
      <path d="M4 13 13 4a2 2 0 0 1 3 3L7 16Z" {...S} />
      <path d="M7 16l-3 3" {...S} />
      <path d="M14 6l4 4" {...S} />
    </>
  ),
  landscaper: (
    <>
      <path d="M12 21v-7" {...S} />
      <path d="M12 14c-4 0-6-2-6-6 4 0 6 2 6 6Z" {...S} />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5Z" {...S} />
    </>
  ),
  ac_technician: (
    <>
      <path d="M12 2v20M2 12h20" {...S} />
      <path d="M5 5l14 14M19 5 5 19" {...S} />
      <path d="M12 5.5 10 4M12 5.5 14 4M12 18.5 10 20M12 18.5 14 20" {...S} />
    </>
  ),
  solar: (
    <>
      <rect x="3" y="13" width="18" height="7" rx="1" {...S} />
      <path d="M7.5 13v7M12 13v7M16.5 13v7M3 16.5h18" {...S} />
      <circle cx="12" cy="6" r="2.5" {...S} />
      <path d="M12 1v1.5M6.5 6H5M19 6h-1.5M8.4 2.4l1 1M15.6 2.4l-1 1" {...S} />
    </>
  ),
  borehole: (
    <>
      <path d="M12 3c3.2 4 5 6.6 5 9a5 5 0 0 1-10 0c0-2.4 1.8-5 5-9Z" {...S} />
      <path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" {...S} />
    </>
  ),
  appliance_repair: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" {...S} />
      <path d="M9 3v18" {...S} />
      <path d="M7 6.5v1M7 10v1" {...S} />
    </>
  ),
  locksmith: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" {...S} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" {...S} />
      <circle cx="12" cy="15.5" r="1.3" {...S} />
    </>
  ),
  glazier: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" {...S} />
      <path d="M12 3v18M4 12h16" {...S} />
    </>
  ),
  pest_control: (
    <>
      <path d="M12 8c2.4 0 4 2.2 4 5s-1.6 5-4 5-4-2.2-4-5 1.6-5 4-5Z" {...S} />
      <path d="M12 4.5V8M9.5 5.5 8 4M14.5 5.5 16 4" {...S} />
      <path d="M8 12H4M20 12h-4M8 16H4.5M19.5 16H16" {...S} />
    </>
  ),
  cleaner: (
    <>
      <path d="M10 8h5l1.5 3v10H10z" {...S} />
      <path d="M10 8V5h3V4h2v4" {...S} />
      <path d="M18 5h2M18 8h2M18 11h2" {...S} />
    </>
  ),
  movers: (
    <>
      <path d="M3 8 12 4l9 4-9 4Z" {...S} />
      <path d="M3 8v8l9 4 9-4V8" {...S} />
      <path d="M12 12v8" {...S} />
    </>
  ),
  it_tech: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" {...S} />
      <path d="M2 20h20M9 16l-.7 4M15 16l.7 4" {...S} />
    </>
  ),
  security_installer: (
    <>
      <path d="M3 7.5 16.5 4l1.2 4.2L4.2 11.7Z" {...S} />
      <path d="M5.5 11 4 15.5" {...S} />
      <path d="M17.7 7 21 8.6" {...S} />
      <circle cx="8" cy="8.5" r="1" {...S} />
    </>
  ),
  satellite: (
    <>
      <circle cx="6" cy="18" r="1.6" {...S} />
      <path d="M4.5 14a5.5 5.5 0 0 1 5.5 5.5" {...S} />
      <path d="M4.5 9.5A10 10 0 0 1 14.5 19.5" {...S} />
      <path d="M4.5 5a15 15 0 0 1 15 15" {...S} />
    </>
  ),
  generator_tech: (
    <>
      <rect x="3" y="8" width="18" height="10" rx="2" {...S} />
      <path d="M7 8V6h5" {...S} />
      <path d="M6 13h3l1.5-2.5L12 15l1.5-2h3" {...S} />
    </>
  ),
  tailor: (
    <>
      <circle cx="6" cy="6" r="2.4" {...S} />
      <circle cx="6" cy="18" r="2.4" {...S} />
      <path d="M8 7.5 20 18M8 16.5 20 6" {...S} />
    </>
  ),
  panel_beater: (
    <>
      <path d="M3 13l2.2-5.5a2 2 0 0 1 1.9-1.3h9.8a2 2 0 0 1 1.9 1.3L21 13" {...S} />
      <path d="M3 13h18v4H3z" {...S} />
      <circle cx="7" cy="17.5" r="1.4" {...S} />
      <circle cx="17" cy="17.5" r="1.4" {...S} />
    </>
  ),
  tow_truck: (
    <>
      <path d="M3 16V8h8v8" {...S} />
      <path d="M11 11h4l4 3v2h-8" {...S} />
      <circle cx="6.5" cy="17.5" r="1.5" {...S} />
      <circle cx="16.5" cy="17.5" r="1.5" {...S} />
      <path d="M14 5l4 3" {...S} />
    </>
  ),
  other: (
    <>
      <circle cx="5.5" cy="12" r="1.5" {...S} />
      <circle cx="12" cy="12" r="1.5" {...S} />
      <circle cx="18.5" cy="12" r="1.5" {...S} />
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
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...S} /><path d="M10 20a2 2 0 0 0 4 0" {...S} /></>,
    doc: <><path d="M6 3h8l4 4v14H6V3Z" {...S} /><path d="M14 3v4h4M9 13h6M9 17h4" {...S} /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" {...S} /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" {...S} /></>,
    play: <path d="M7 5l12 7-12 7V5Z" {...S} />,
    x: <path d="M6 6l12 12M18 6 6 18" {...S} />,
    logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12h9M16 8l4 4-4 4" {...S} />,
    search: <><circle cx="11" cy="11" r="7" {...S} /><path d="m20 20-3.5-3.5" {...S} /></>,
    handshake: <path d="M3 10l4-4 3 2 3-2 4 4v5l-4 3-3-3-3 3-4-3v-5Z" {...S} />,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2" {...S} /><path d="M3 10h18M16 14h2" {...S} /></>,
    coins: <><ellipse cx="9" cy="7" rx="6" ry="3" {...S} /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" {...S} /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.3-1.6-2.4-4-2.8" {...S} /></>,
    verified: <><path d="m12 3 2.2 1.6 2.7-.2 1 2.5 2.4 1.2-.6 2.6 1.1 2.5-1.9 2 .2 2.7-2.7.5-1.5 2.3-2.5-1-2.5 1-1.5-2.3-2.7-.5.2-2.7-1.9-2 1.1-2.5-.6-2.6 2.4-1.2 1-2.5 2.7.2L12 3Z" {...S} /><path d="m9 12 2 2 4-4" {...S} /></>,
    users: <><circle cx="9" cy="8" r="3.2" {...S} /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-3-4.9" {...S} /></>,
    ban: <><circle cx="12" cy="12" r="9" {...S} /><path d="m5.6 5.6 12.8 12.8" {...S} /></>,
    flag: <path d="M5 21V4h11l-1.5 4L16 12H5" {...S} />,
    chart: <><path d="M4 4v16h16" {...S} /><path d="M8 15l3-4 3 2 4-6" {...S} /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.4" {...S} /><rect x="14" y="3" width="7" height="7" rx="1.4" {...S} /><rect x="3" y="14" width="7" height="7" rx="1.4" {...S} /><rect x="14" y="14" width="7" height="7" rx="1.4" {...S} /></>,
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" {...S} />,
    key: <><circle cx="8" cy="15" r="4" {...S} /><path d="m11 12 9-9M17 3l3 3M15 5l2 2" {...S} /></>,
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
