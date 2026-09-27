// Shared constants for TradeLink.

const CATEGORIES = [
  'electrician',
  'plumber',
  'mechanic',
  'handyman',
  'carpenter',
  'painter',
  'welder',
  'builder',
  'tiler',
  'roofer',
  'plasterer',
  'landscaper',
  'ac_technician',
  'solar',
  'borehole',
  'appliance_repair',
  'locksmith',
  'glazier',
  'pest_control',
  'cleaner',
  'movers',
  'it_tech',
  'security_installer',
  'satellite',
  'generator_tech',
  'tailor',
  'panel_beater',
  'tow_truck',
  'other',
];

// Human-readable labels for categories (used in notification messages).
const CATEGORY_LABELS = {
  electrician: 'Electrician', plumber: 'Plumber', mechanic: 'Mechanic', handyman: 'Handyman',
  carpenter: 'Carpenter', painter: 'Painter', welder: 'Welder', builder: 'Builder', tiler: 'Tiler',
  roofer: 'Roofer', plasterer: 'Plasterer', landscaper: 'Gardener / Landscaper',
  ac_technician: 'Fridge & AC Tech', solar: 'Solar Installer', borehole: 'Borehole & Pumps',
  appliance_repair: 'Appliance Repair', locksmith: 'Locksmith', glazier: 'Glass & Windows',
  pest_control: 'Pest Control', cleaner: 'Cleaning Services', movers: 'Movers & Removals',
  it_tech: 'Computer & IT', security_installer: 'CCTV & Security', satellite: 'DSTV & Satellite',
  generator_tech: 'Generator Tech', tailor: 'Tailor & Upholstery', panel_beater: 'Panel Beater & Spray',
  tow_truck: 'Tow Truck', other: 'Other',
};

// --- Credits / billing -----------------------------------------------------
// Wallet holds an integer credit balance. Bundles convert USD -> credits, with
// small bonuses on larger bundles (kept deliberately cheap). Prices are USD.
const CREDIT_BUNDLES = [
  { id: 'starter',  usd: 2,  credits: 20,  label: 'Starter'  },
  { id: 'standard', usd: 5,  credits: 55,  label: 'Standard', bonus: '+5 free' },
  { id: 'pro',      usd: 10, credits: 120, label: 'Pro',      bonus: '+20 free' },
  { id: 'max',      usd: 20, credits: 260, label: 'Max',      bonus: '+60 free' },
];

// Fee (in credits) charged to a tradesperson when their offer is accepted,
// tiered by the agreed price so small jobs cost little. Ready for when billing
// is switched on; while BILLING_ENABLED is false the fee is always 0 (free).
const FEE_BANDS = [
  { maxPrice: 50,       credits: 5  },
  { maxPrice: 150,      credits: 15 },
  { maxPrice: 400,      credits: 30 },
  { maxPrice: Infinity, credits: 50 },
];

// Master switch. Launch FREE: keep this false so no credits are ever deducted.
// Flip to true (env BILLING_ENABLED=1) once liquidity + earnings are proven.
const BILLING_ENABLED = process.env.BILLING_ENABLED === '1';

function feeForPrice(price) {
  if (!BILLING_ENABLED) return 0;
  const band = FEE_BANDS.find((b) => Number(price) <= b.maxPrice) || FEE_BANDS[FEE_BANDS.length - 1];
  return band.credits;
}

function bundleById(id) {
  return CREDIT_BUNDLES.find((b) => b.id === id) || null;
}

const JOB_STATUS = ['open', 'matched', 'in_progress', 'completed', 'cancelled'];

// Allowed forward transitions initiated by the customer.
const JOB_TRANSITIONS = {
  matched: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  open: ['cancelled'],
};

module.exports = {
  CATEGORIES,
  CATEGORY_LABELS,
  JOB_STATUS,
  JOB_TRANSITIONS,
  CREDIT_BUNDLES,
  FEE_BANDS,
  BILLING_ENABLED,
  feeForPrice,
  bundleById,
};
