/**
 * authRoutes.js
 *
 * Public authentication routes for DermaScan.
 *
 * ── Standard (single-step) ──────────────────────────────────────────────────
 *  POST /api/auth/register          OTP-verified registration
 *  POST /api/auth/login             Legacy single-step login (backward-compat)
 *  POST /api/auth/google            Google OAuth (no OTP)
 *
 * ── OTP helpers ────────────────────────────────────────────────────────────
 *  POST /api/auth/send-otp          Generate & email a 4-digit OTP
 *  POST /api/auth/verify-otp        Verify OTP → returns short-lived otpToken
 *
 * ── 2FA login (new clients) ─────────────────────────────────────────────────
 *  POST /api/auth/login-initiate    Step 1: verify creds, send login OTP
 *  POST /api/auth/login-complete    Step 3: verify otpToken, issue app JWT
 */

const router = require('express').Router();

const {
  register,
  login,
  googleLogin,
  sendOtp,
  verifyOtp,
  loginInitiate,
  loginComplete,
} = require('../controllers/authController');

const { validate, schemas } = require('../middleware/validate');

// ── OTP helpers ─────────────────────────────────────────────────────────────
router.post('/send-otp',    validate(schemas.sendOtp),   sendOtp);
router.post('/verify-otp',  validate(schemas.verifyOtp), verifyOtp);

// ── OTP-gated registration ───────────────────────────────────────────────────
router.post('/register',    validate(schemas.register),  register);

// ── 2FA login flow ───────────────────────────────────────────────────────────
router.post('/login-initiate', validate(schemas.loginInitiate), loginInitiate);
router.post('/login-complete', validate(schemas.loginComplete),  loginComplete);

// ── Legacy single-step login (backward-compat) ──────────────────────────────
router.post('/login',  login);

// ── Google OAuth (no OTP) ───────────────────────────────────────────────────
router.post('/google', googleLogin);

module.exports = router;
