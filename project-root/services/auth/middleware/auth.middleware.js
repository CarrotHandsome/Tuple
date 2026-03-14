const jwt = require('jsonwebtoken');
const User = require('../../../shared/models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const tokenExists = user.auth_tokens.some(t => t.token === token);
    if (!tokenExists) {
      return res.status(401).json({ error: 'Token has been invalidated.' });
    }

    // Attach user and token to request for use in controllers
    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = authMiddleware;
