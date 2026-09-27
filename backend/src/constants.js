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

const JOB_STATUS = ['open', 'matched', 'in_progress', 'completed', 'cancelled'];

// Allowed forward transitions initiated by the customer.
const JOB_TRANSITIONS = {
  matched: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  open: ['cancelled'],
};

module.exports = { CATEGORIES, JOB_STATUS, JOB_TRANSITIONS };
