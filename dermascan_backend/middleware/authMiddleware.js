const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const mongoose = require('mongoose');
const crypto = require('crypto');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // All tokens must be valid signed JWTs
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // If database is connected, resolve to the actual MongoDB User document
      if (mongoose.connection.readyState === 1) {
        let user = null;

        // 1. Try resolving by ObjectId if decoded.id is a valid ObjectId
        if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
          user = await User.findById(decoded.id).select('-password');
        }

        // 2. If not found by ID (e.g. token has google_ or user_ prefix), resolve by email
        if (!user && decoded.email) {
          const cleanEmail = decoded.email.toLowerCase().trim();
          user = await User.findOne({ email: cleanEmail }).select('-password');

          // If the user does not exist yet in MongoDB, create the real MongoDB User document
          if (!user) {
            try {
              const cleanName = decoded.name || 'User';
              user = await User.create({
                name: cleanName,
                email: cleanEmail,
                password: crypto.randomBytes(20).toString('hex'),
                role: decoded.role || 'user'
              });
              await UserProfile.create({ user_id: user._id }).catch(() => {});
              console.log(`[Auth] Resolved and created MongoDB User ${user._id} for account ${user.email}`);
            } catch (createErr) {
              console.error('[Auth Error] Failed to create MongoDB User for account:', decoded.email, createErr.message);
            }
          }
        }

        if (user) {
          req.user = user;
          return next();
        }

        console.error('[Auth Error] Failed to resolve user from token:', { id: decoded.id, email: decoded.email });
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // If database is temporarily down, check fallback store for signed tokens
      if (decoded.email) {
        const fallbackStore = require('../data/fallbackStore');
        const userFromStore = fallbackStore.getUserByEmail(decoded.email) || {};
        req.user = {
          _id: decoded.id,
          id: decoded.id,
          name: decoded.name || userFromStore.name || 'User',
          email: decoded.email || userFromStore.email || '',
          role: decoded.role || userFromStore.role || 'user'
        };
        return next();
      }

      return res.status(503).json({ success: false, message: 'Database temporarily unavailable' });
    } catch (error) {
      console.error('[Auth Error] Token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protect };

