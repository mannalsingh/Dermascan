/**
 * OtpToken Model
 *
 * Stores hashed OTPs for email verification flows (register, login, email_change).
 * - otpHash: bcrypt hash of the 4-digit OTP — never store plain OTPs.
 * - expiresAt: set to 2 minutes from creation; the TTL index handles auto-deletion.
 * - used: marked true after a successful verify to prevent replay attacks.
 */

const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },

    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },

    type: {
      type: String,
      enum: ['register', 'login', 'email_change', 'password_reset'],
      required: [true, 'OTP type is required'],
    },

    // The TTL index (below) will auto-delete documents once this date is reached.
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },

    // Once verified, mark as used so it cannot be replayed within the TTL window.
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Disable automatic __v field; saves a tiny amount of write overhead.
    versionKey: false,
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * TTL index — MongoDB will automatically delete each document after `expiresAt`.
 * `expireAfterSeconds: 0` means "delete at the exact moment expiresAt is reached".
 */
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Compound index on email + type for fast lookup when verifying an OTP.
 */
otpTokenSchema.index({ email: 1, type: 1 });

// ---------------------------------------------------------------------------

const OtpToken = mongoose.model('OtpToken', otpTokenSchema);

module.exports = OtpToken;
