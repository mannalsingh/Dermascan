/**
 * userRoutes.js
 *
 * Protected user-management routes for DermaScan.
 * All routes require a valid JWT (enforced by the `protect` middleware).
 *
 *  GET  /api/user/profile               Fetch user + extended profile
 *  PUT  /api/user/profile               Update name / profile fields
 *  POST /api/user/request-email-change  Step 1: sends OTP to new email
 *  POST /api/user/confirm-email-change  Step 2: verifies OTP, updates email
 */

const router = require('express').Router();

const {
  getProfile,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  changePassword,
} = require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');

// ── Profile ─────────────────────────────────────────────────────────────────
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// ── Password Change ─────────────────────────────────────────────────────────
router.post(
  '/change-password',
  protect,
  validate(schemas.changePassword),
  changePassword
);

// ── Email-change (2-step, OTP-verified) ─────────────────────────────────────
router.post(
  '/request-email-change',
  protect,
  validate(schemas.requestEmailChange),
  requestEmailChange
);

router.post(
  '/confirm-email-change',
  protect,
  validate(schemas.confirmEmailChange),
  confirmEmailChange
);

module.exports = router;
