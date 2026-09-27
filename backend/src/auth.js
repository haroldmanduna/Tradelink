const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tradelink-dev-secret-change-me';
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

module.exports = { signToken, requireAuth, requireRole, JWT_SECRET };
