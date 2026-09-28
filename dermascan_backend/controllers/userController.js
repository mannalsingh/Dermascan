const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const OtpToken = require('../models/OtpToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../config/emailService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates the application JWT for a User document.
 * Mirrors the same payload shape used in authController.
 *
 * @param {object} userObj  Mongoose User doc or plain object with id/email/name/role
 * @returns {string}
 */
const generateToken = (userObj) => {
  const payload = {
    id: userObj.id || userObj._id,
    name: userObj.name,
    email: userObj.email,
    role: userObj.role || 'user',
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ---------------------------------------------------------------------------
// Profile endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/user/profile
 * Protected — requires valid JWT (req.user set by authMiddleware).
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profile = await UserProfile.findOne({ user_id: req.user.id });
    if (!profile) {
      profile = await UserProfile.create({ user_id: req.user.id });
    }

    res.status(200).json({
      success: true,
      data: { user, profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/user/profile
 * Protected — updates name on User doc and extended fields on UserProfile.
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, date_of_birth, gender, address } = req.body;

    if (name && name.trim()) {
      await User.findByIdAndUpdate(req.user.id, { name: name.trim() });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { user_id: req.user.id },
      { phone, date_of_birth, gender, address },
      { new: true, runValidators: true, upsert: true }
    );

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: { profile, user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Email-change endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/user/request-email-change
 * Protected — sends an OTP to the NEW email address the user wants to adopt.
 *
 * Body: { newEmail }
 */
exports.requestEmailChange = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    const cleanNew = newEmail.toLowerCase().trim();

    // Fetch the current authenticated user
    const currentUser = await User.findById(req.user.id).select('email');
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent a no-op change
    if (cleanNew === currentUser.email.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        message: 'New email address must be different from your current email.',
      });
    }

    // Check if another account already uses the target address
    const conflict = await User.findOne({ email: cleanNew });
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already in use by another account.',
      });
    }

    // Generate OTP and send to the NEW address (not the old one)
    const otpGenerator = require('otp-generator');
    const otp = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const otpHash = await bcrypt.hash(otp, 10);

    // Invalidate any existing pending change for this new address
    await OtpToken.deleteMany({ email: cleanNew, type: 'email_change' });

    await OtpToken.create({
      email: cleanNew,
      otpHash,
      type: 'email_change',
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
    });

    try {
      await sendOtpEmail(cleanNew, otp, 'email_change');
    } catch (emailErr) {
      console.error('[requestEmailChange] Email send failed:', emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to new email address. Please verify to confirm the change.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/confirm-email-change
 * Protected — verifies the OTP sent to the new email and updates the account.
 *
 * Body: { otp, newEmail }
 *
 * On success issues a new JWT containing the updated email so the client can
 * refresh its stored token without requiring a fresh login.
 */
exports.confirmEmailChange = async (req, res, next) => {
  try {
    const { otp, newEmail } = req.body;
    const cleanNew = newEmail.toLowerCase().trim();

    // ── Find the pending OTP token for the new email ───────────────────────
    const tokenDoc = await OtpToken.findOne({
      email: cleanNew,
      type: 'email_change',
      used: false,
    });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new email change.',
      });
    }

    // Manual expiry guard (belt-and-suspenders)
    if (Date.now() > tokenDoc.expiresAt.getTime()) {
      await tokenDoc.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new email change.',
      });
    }

    // Constant-time comparison
    const isMatch = await bcrypt.compare(otp, tokenDoc.otpHash);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Mark token used before touching the user record (prevents replay)
    tokenDoc.used = true;
    await tokenDoc.save();

    // ── Update the User document ───────────────────────────────────────────
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.email = cleanNew;
    await user.save();

    // Issue a fresh JWT with the updated email payload
    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/change-password
 * Protected — updates password for authenticated user.
 * Body: { currentPassword, newPassword }
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
