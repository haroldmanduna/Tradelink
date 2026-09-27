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
];

const JOB_STATUS = ['open', 'matched', 'in_progress', 'completed', 'cancelled'];

// Allowed forward transitions initiated by the customer.
const JOB_TRANSITIONS = {
  matched: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  open: ['cancelled'],
};

module.exports = { CATEGORIES, JOB_STATUS, JOB_TRANSITIONS };
