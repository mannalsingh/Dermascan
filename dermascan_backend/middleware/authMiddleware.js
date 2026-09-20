
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // All tokens must be valid signed JWTs — no raw-string bypasses
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fallback-store users: valid JWTs whose IDs are non-ObjectId strings
      // (issued when DB was down during registration/login)
      if (
        mongoose.connection.readyState !== 1 ||
        (decoded.id && typeof decoded.id === 'string' && (
          decoded.id.startsWith('user_') ||
          decoded.id.startsWith('local_') ||
          decoded.id.startsWith('google')
        ))
      ) {
        const fallbackStore = require('../data/fallbackStore');
        const userFromStore = (decoded.email && fallbackStore.getUserByEmail(decoded.email)) || {};
        const userName = decoded.name || userFromStore.name || 'User';
        const userEmail = decoded.email || userFromStore.email || '';

        req.user = {
          _id: decoded.id,
          id: decoded.id,
          name: userName,
          email: userEmail,
          role: decoded.role || userFromStore.role || 'user'
        };
        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
