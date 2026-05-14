const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { findUserById, sanitizeUser } = require('../utils/users');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token.' });
    req.user = sanitizeUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
