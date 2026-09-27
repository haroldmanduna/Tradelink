const jwt = require('jsonwebtoken');
const { query } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'trustade-dev-secret-change-me';
const TOKEN_TTL = '30d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Middleware: require a valid bearer token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Middleware factory: require a specific role.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Only ${role} accounts can do this.` });
    }
    return next();
  };
}

// Middleware: block requests from suspended accounts. Checks the DB live so a
// suspension takes effect immediately, even on an already-issued token.
async function notSuspended(req, res, next) {
  try {
    const { rows } = await query('SELECT suspended FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found.' });
    if (rows[0].suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

// Middleware: require an admin (or superadmin) account. Verified live against
// the DB so demotions/suspensions apply immediately. Sets req.admin.
async function requireAdmin(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT id, name, role, is_superadmin, suspended FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = rows[0];
    if (!u || u.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only.' });
    }
    if (u.suspended) {
      return res.status(403).json({ error: 'This admin account is suspended.' });
    }
    req.admin = { id: u.id, name: u.name, is_superadmin: u.is_superadmin };
    return next();
  } catch (err) {
    return next(err);
  }
}

// Middleware: require THE superadmin.
function requireSuperadmin(req, res, next) {
  if (!req.admin || !req.admin.is_superadmin) {
    return res.status(403).json({ error: 'Only the superadmin can do this.' });
  }
  return next();
}

module.exports = {
  signToken, requireAuth, requireRole, notSuspended,
  requireAdmin, requireSuperadmin, JWT_SECRET,
};
