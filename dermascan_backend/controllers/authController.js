const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const jwt = require('jsonwebtoken');
const fallbackStore = require('../data/fallbackStore');
const { OAuth2Client } = require('google-auth-library');


const generateToken = (userObj) => {
  const payload = typeof userObj === 'object' && userObj !== null
    ? {
        id: userObj.id || userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role || 'user'
      }
    : { id: userObj };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      const existing = fallbackStore.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      const cleanName = (name && name.trim()) || fallbackStore.cleanNameFromEmail(email);
      const user = fallbackStore.saveUser({
        id: mockUserId,
        name: cleanName,
        email,
        password,
        role: role || 'user',
      });

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = await User.create({ name, email, password, role });
    await UserProfile.create({ user_id: user._id });

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      let existingUser = fallbackStore.getUserByEmail(email);

      if (existingUser) {
        if (existingUser.password && existingUser.password !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      } else {
        const cleanName = fallbackStore.cleanNameFromEmail(email);
        existingUser = fallbackStore.saveUser({
          id: 'user_' + Buffer.from(email).toString('base64').substring(0, 8),
          name: cleanName,
          email,
          password,
          role: 'user',
        });
      }

      const token = generateToken(existingUser);
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: 'Google login is not configured on this server' });
    }

    // Verify the Google ID token server-side — identity comes from Google, not from client body
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ success: false, message: 'Google token verification failed' });
    }

    const email = payload.email;
    const name = payload.name || fallbackStore.cleanNameFromEmail(email);
    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      let existingUser = fallbackStore.getUserByEmail(email);
      if (!existingUser) {
        existingUser = fallbackStore.saveUser({
          id: 'google_' + Buffer.from(email).toString('base64').substring(0, 10),
          name,
          email,
          role: 'user',
        });
      } else if (name && existingUser.name !== name) {
        existingUser.name = name;
        fallbackStore.saveUser(existingUser);
      }

      const token = generateToken(existingUser);
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role
        },
      });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: require('crypto').randomBytes(20).toString('hex'),
        role: 'user',
      });
      await UserProfile.create({ user_id: user._id });
    } else if (name && user.name !== name) {
      user.name = name;
      await user.save();
    }

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};
