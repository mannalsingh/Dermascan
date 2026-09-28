/**
 * authController.js
 *
 * Handles all authentication flows for DermaScan:
 *  - register      (OTP-verified email required)
 *  - login         (legacy single-step, backward-compat)
 *  - loginInitiate (step 1 of 2FA login — verify creds, send OTP)
 *  - loginComplete (step 3 of 2FA login — verify otpToken, issue JWT)
 *  - sendOtp       (send OTP for register / login / email_change)
 *  - verifyOtp     (verify OTP, issue short-lived otpToken JWT)
 *  - googleLogin   (Google OAuth — NO OTP, unchanged)
 */

const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const OtpToken = require('../models/OtpToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const otpGenerator = require('otp-generator');
const fallbackStore = require('../data/fallbackStore');
const { OAuth2Client } = require('google-auth-library');
const { sendOtpEmail } = require('../config/emailService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a long-lived application JWT (7 d by default).
 * Accepts either a full user object or a bare user id string.
 *
 * @param {object|string} userObj
 * @returns {string}
 */
const generateToken = (userObj) => {
  const payload =
    typeof userObj === 'object' && userObj !== null
      ? {
          id: userObj.id || userObj._id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role || 'user',
        }
      : { id: userObj };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Internal helper — shared OTP generation + persistence + email send.
 * Used by both `sendOtp` (public) and `loginInitiate`.
 *
 * @param {string} email
 * @param {'register'|'login'|'email_change'} type
 * @returns {Promise<void>}
 * @throws If the email send fails.
 */
const _generateAndSendOtp = async (email, type) => {
  // 4-digit numeric OTP
  const otp = otpGenerator.generate(4, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  // Hash before persistence — we NEVER store plain OTPs
  const otpHash = await bcrypt.hash(otp, 10);

  // Remove any pre-existing (valid or expired) token for this email+type
  await OtpToken.deleteMany({ email: email.toLowerCase().trim(), type });

  // Persist hashed token (TTL index will auto-delete after expiresAt)
  await OtpToken.create({
    email: email.toLowerCase().trim(),
    otpHash,
    type,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
  });

  // Fire the email — throws on SMTP failure so caller can surface the error
  await sendOtpEmail(email, otp, type);
};

// ---------------------------------------------------------------------------
// OTP endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/send-otp
 * Body: { email, type }
 *
 * For type 'login': validates that an account exists before sending.
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { email, type } = req.body;
    const mongoose = require('mongoose');

    // For login OTPs, verify the account exists first (no account → no OTP)
    if (type === 'login') {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database unavailable. Cannot send login OTP.',
        });
      }
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: 'No account found with this email' });
      }
    }

    await _generateAndSendOtp(email, type);

    return res
      .status(200)
      .json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('[sendOtp Error]', error.message);
    // Surface email-send failures with a friendly message; let others bubble
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP email. Please try again.',
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp, type }
 *
 * On success: marks token as used and issues a short-lived (10 min) otpToken JWT.
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Find an un-used token for this email + type
    const tokenDoc = await OtpToken.findOne({ email: cleanEmail, type, used: false });
    if (!tokenDoc) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Manual expiry check (belt-and-suspenders alongside the TTL index)
    if (Date.now() > tokenDoc.expiresAt.getTime()) {
      await tokenDoc.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Constant-time bcrypt comparison
    const isMatch = await bcrypt.compare(otp, tokenDoc.otpHash);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Mark as used to prevent replay within the TTL window
    tokenDoc.used = true;
    await tokenDoc.save();

    // Issue a short-lived JWT that the client must present at the next step
    const otpToken = jwt.sign(
      { email: cleanEmail, type, verified: true },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.status(200).json({ success: true, message: 'OTP verified', otpToken });
  } catch (error) {
    console.error('[verifyOtp Error]', error.message);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 * Body: { name, email, password, otpToken }
 *
 * Requires a valid otpToken (type: 'register') from verifyOtp before creating
 * the account. Falls back to in-memory store when MongoDB is offline.
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, otpToken } = req.body;
    const mongoose = require('mongoose');

    // ── OTP session guard (MongoDB must be up to validate tokens) ──────────
    // Only enforce otpToken when MongoDB is available; fallback skips it to
    // preserve the offline demo mode.
    if (otpToken && mongoose.connection.readyState === 1) {
      let decoded;
      try {
        decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({
          success: false,
          message: 'OTP session expired. Please verify your email again.',
        });
      }

      const cleanEmail = email ? email.toLowerCase().trim() : '';
      if (
        decoded.type !== 'register' ||
        decoded.email !== cleanEmail ||
        !decoded.verified
      ) {
        return res.status(401).json({
          success: false,
          message: 'OTP session is not valid for this email. Please verify again.',
        });
      }
    } else if (!otpToken && mongoose.connection.readyState === 1) {
      // MongoDB is online but no otpToken was provided
      return res.status(401).json({
        success: false,
        message: 'Email verification is required. Please verify your email first.',
      });
    }

    // ── Fallback store (MongoDB offline) ───────────────────────────────────
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    // ── MongoDB path ────────────────────────────────────────────────────────
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
      role: user.role,
    });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Login — legacy single-step (backward-compat)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Single-step login kept for backward compatibility.
 * New clients should use loginInitiate → verifyOtp → loginComplete.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide an email and password' });
    }

    const mongoose = require('mongoose');

    // ── Fallback store ──────────────────────────────────────────────────────
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

    // ── MongoDB path ────────────────────────────────────────────────────────
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
      role: user.role,
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

// ---------------------------------------------------------------------------
// Login — 2FA flow (Step 1 of 3)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login-initiate
 * Body: { email, password }
 *
 * Step 1: Validates credentials. If correct, fires an OTP to the user's email
 * and returns { success: true, requireOtp: true }.
 * The client then calls POST /api/auth/verify-otp with type:'login'.
 */
exports.loginInitiate = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide an email and password' });
    }

    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please use the standard login endpoint.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Credentials are correct — send OTP and wait for step 2 (verify-otp)
    try {
      await _generateAndSendOtp(user.email, 'login');
    } catch (emailErr) {
      console.error('[loginInitiate] OTP email failed:', emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send login OTP email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      requireOtp: true,
      message: 'OTP sent to your email. Please verify to complete login.',
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Login — 2FA flow (Step 3 of 3)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login-complete
 * Body: { email, otpToken }
 *
 * Step 3: Client presents the otpToken (short-lived JWT from verifyOtp, type:'login').
 * On success, issues the full application JWT.
 */
exports.loginComplete = async (req, res, next) => {
  try {
    const { email, otpToken } = req.body;

    if (!email || !otpToken) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and otpToken are required' });
    }

    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Cannot complete login.',
      });
    }

    // Verify the short-lived otpToken
    let decoded;
    try {
      decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'OTP session expired. Please start the login process again.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Ensure the token was issued for login and matches the supplied email
    if (decoded.type !== 'login' || decoded.email !== cleanEmail || !decoded.verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP session. Please start the login process again.',
      });
    }

    // Fetch the user and issue the full JWT
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found' });
    }

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Google OAuth — unchanged, no OTP
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/google
 * Body: { credential }  (Google ID token)
 *
 * Google users are authenticated via Google's servers — OTP is not required.
 */
exports.googleLogin = async (req, res, next) => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res
        .status(400)
        .json({ success: false, message: 'Google authentication token is required' });
    }

    let email, name;

    if (credential) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res
          .status(503)
          .json({ success: false, message: 'Google login is not configured on this server' });
      }

      // Verify the Google ID token server-side
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
      } catch (verifyErr) {
        return res
          .status(401)
          .json({ success: false, message: 'Google token verification failed' });
      }
    } else if (accessToken) {
      // Verify OAuth2 access token by querying Google userinfo
      const axios = require('axios');
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        email = userInfoRes.data.email;
        name = userInfoRes.data.name;
      } catch (err) {
        return res
          .status(401)
          .json({ success: false, message: 'Google access token verification failed' });
      }
    }

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Unable to retrieve email from Google' });
    }

    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      console.error(
        '[Google Auth Error] MongoDB is not connected (readyState: ' +
          mongoose.connection.readyState +
          ')'
      );
      return res.status(503).json({
        success: false,
        message: 'Database is currently unavailable. Please verify MongoDB Atlas connection.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name && name.trim()) || fallbackStore.cleanNameFromEmail(cleanEmail);

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: require('crypto').randomBytes(20).toString('hex'),
        role: 'user',
      });
      await UserProfile.create({ user_id: user._id }).catch(() => {});
      console.log(`[Google Auth] Created new MongoDB User ${user._id} for ${cleanEmail}`);
    } else if (cleanName && user.name !== cleanName) {
      user.name = cleanName;
      await user.save();
    }

    console.log(`[Google Auth] User authenticated successfully: ${user._id} (${cleanEmail})`);

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('[Google Auth Error]', error.message);
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Sends a 4-digit password reset OTP to user's registered email.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    await _generateAndSendOtp(cleanEmail, 'password_reset');

    res.status(200).json({
      success: true,
      message: 'A 4-digit password reset code has been sent to your email.',
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error.message);
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 *
 * Verifies the 4-digit OTP and securely updates user password.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const tokenDoc = await OtpToken.findOne({
      email: cleanEmail,
      type: 'password_reset',
      used: false,
    });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code. Please request a new one.',
      });
    }

    if (Date.now() > tokenDoc.expiresAt.getTime()) {
      await OtpToken.findByIdAndDelete(tokenDoc._id);
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    const isMatch = await bcrypt.compare(otp, tokenDoc.otpHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect 4-digit code. Please check your email and try again.',
      });
    }

    tokenDoc.used = true;
    await tokenDoc.save();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    console.error('[Reset Password Error]', error.message);
    next(error);
  }
};
