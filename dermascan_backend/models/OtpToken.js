/**
 * OtpToken Model
 *
 * Stores hashed OTPs for email verification flows:
 * - 'google_login': Google Sign-In 2FA verification
 * - 'login': Standard password 2FA login
 * - 'register': Pre-registration email verification
 * - 'email_change': Profile email update
 * - 'password_reset': Password recovery
 *
 * Security features:
 * - otpHash: bcrypt hash of the 4-digit OTP — plain text OTPs are never stored.
 * - Single-use: `used` flag set to true immediately upon successful verification.
 * - Brute-force protection: `attempts` counter capped at `maxAttempts` (default 5).
 * - Auto-expiration: MongoDB TTL index removes records when `expiresAt` is reached.
 */

const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },

    type: {
      type: String,
      enum: ['register', 'login', 'email_change', 'password_reset', 'google_login'],
      required: [true, 'OTP type is required'],
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// TTL index — document is deleted automatically by MongoDB at `expiresAt`
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for performant lookups during verification and resend
otpTokenSchema.index({ email: 1, type: 1, used: 1 });
otpTokenSchema.index({ userId: 1, type: 1, used: 1 });

const OtpToken = mongoose.model('OtpToken', otpTokenSchema);

module.exports = OtpToken;
