/**
 * validate.js — Joi request-body validation middleware
 *
 * Usage:
 *   const { validate, schemas } = require('./validate');
 *   router.post('/register', validate(schemas.register), registerController);
 *
 * On validation failure the middleware short-circuits with HTTP 422 and a
 * human-readable message — controllers never receive an invalid body.
 */

const Joi = require('joi');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const schemas = {
  /** POST /api/auth/send-otp */
  sendOtp: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    type: Joi.string().valid('register', 'login', 'email_change', 'password_reset').required(),
  }),

  /** POST /api/auth/verify-otp */
  verifyOtp: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    otp: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
    type: Joi.string().valid('register', 'login', 'email_change', 'password_reset').required(),
  }),

  /** POST /api/auth/register — now requires a verified otpToken */
  register: Joi.object({
    name: Joi.string().min(2).max(60).trim().required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required(),
    otpToken: Joi.string().required(), // short-lived JWT issued after OTP verify
  }),

  /** POST /api/auth/login (legacy single-step endpoint) */
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().max(128).required(),
  }),

  /** POST /api/auth/login-initiate — step 1 of 2FA login */
  loginInitiate: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().max(128).required(),
  }),

  /** POST /api/auth/login-complete — step 3 of 2FA login */
  loginComplete: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    otpToken: Joi.string().required(),
  }),

  /** POST /api/auth/forgot-password */
  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),

  /** POST /api/auth/reset-password */
  resetPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    otp: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),

  /** POST /api/user/change-password */
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),

  /** POST /api/user/request-email-change */
  requestEmailChange: Joi.object({
    newEmail: Joi.string().email().lowercase().trim().required(),
  }),

  /** POST /api/user/confirm-email-change */
  confirmEmailChange: Joi.object({
    otp: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
    newEmail: Joi.string().email().lowercase().trim().required(),
  }),
};

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns an Express middleware that validates `req.body` against `schema`.
 * All validation errors are collected (abortEarly: false) and returned as a
 * single 422 response so the client sees every problem at once.
 *
 * @param {Joi.ObjectSchema} schema
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    return res.status(422).json({ success: false, message: messages });
  }
  next();
};

// ---------------------------------------------------------------------------

module.exports = { validate, schemas };
