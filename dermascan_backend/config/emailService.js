/**
 * emailService.js
 *
 * Nodemailer-based email service for DermaScan.
 *
 * Transporter strategy:
 *  - If SMTP_HOST is set in env → use generic SMTP (works with any provider).
 *  - Otherwise → fall back to Gmail (uses EMAIL_USER / EMAIL_PASS, which
 *    should be a Gmail App Password when 2FA is enabled on the account).
 */

const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transporter factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns a configured nodemailer transporter.
 * Call this per-send (nodemailer manages the connection pool internally).
 *
 * @returns {nodemailer.Transporter}
 */
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    // Generic SMTP — suitable for SendGrid, Mailgun, AWS SES, etc.
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for port 465 (TLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Gmail with an App Password
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ---------------------------------------------------------------------------
// HTML Template helpers
// ---------------------------------------------------------------------------

/**
 * Returns per-type copy (subject line + descriptive blurb shown above the OTP).
 *
 * @param {'register'|'login'|'email_change'} type
 * @returns {{ subject: string, headline: string, body: string }}
 */
const getEmailCopy = (type) => {
  switch (type) {
    case 'register':
      return {
        subject: 'Verify your DermaScan account',
        headline: 'Welcome to DermaScan! 🎉',
        body: 'You\'re one step away from creating your account. Use the verification code below to confirm your email address and get started.',
      };
    case 'login':
      return {
        subject: 'Your DermaScan login code',
        headline: 'Secure Login Code',
        body: 'A login attempt was made on your DermaScan account. Use the code below to complete sign-in. If this wasn\'t you, please ignore this email and consider changing your password.',
      };
    case 'email_change':
      return {
        subject: 'Confirm your new email — DermaScan',
        headline: 'Confirm Your New Email Address',
        body: 'We received a request to update the email address linked to your DermaScan account. Use the code below to confirm your new email address.',
      };
    case 'password_reset':
      return {
        subject: 'Reset your DermaScan password',
        headline: 'Password Reset Request',
        body: 'We received a request to reset your password for your DermaScan account. Use the 4-digit code below to set a new password. If you did not make this request, you can safely ignore this email.',
      };
    default:
      return {
        subject: 'Your DermaScan verification code',
        headline: 'Verification Code',
        body: 'Use the code below to complete your action on DermaScan.',
      };
  }
};

/**
 * Builds a production-quality responsive HTML email body.
 *
 * @param {string} otp   4-digit numeric OTP (plain text — shown once in email)
 * @param {'register'|'login'|'email_change'} type
 * @returns {string} Full HTML document string
 */
const buildHtmlTemplate = (otp, type) => {
  const { headline, body } = getEmailCopy(type);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>DermaScan — Verification Code</title>
  <style>
    /* Reset */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f0f9f8;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }
    a { color: #0f766e; text-decoration: none; }
    /* Responsive wrapper */
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 32px auto;
      padding: 0 16px;
    }
    /* Card */
    .card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(15, 118, 110, 0.10);
    }
    /* Header gradient */
    .header {
      background: linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #0d9488 100%);
      padding: 36px 40px 28px;
      text-align: center;
    }
    .header-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      font-size: 2rem;
      line-height: 1;
    }
    .brand-name {
      font-size: 1.6rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand-tagline {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.72);
      margin-top: 4px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    /* Body */
    .body {
      padding: 40px 40px 32px;
    }
    .headline {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .description {
      font-size: 0.95rem;
      line-height: 1.65;
      color: #475569;
      margin-bottom: 32px;
    }
    /* OTP box */
    .otp-label {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #0f766e;
      margin-bottom: 10px;
    }
    .otp-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 32px;
    }
    .otp-box {
      background: #f0fdf4;
      border: 2px solid #0f766e;
      border-radius: 12px;
      padding: 20px 40px;
      text-align: center;
    }
    .otp-code {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: 0.5em;
      color: #0f766e;
      /* Nudge the trailing space from letter-spacing so OTP looks centred */
      padding-left: 0.5em;
      line-height: 1.1;
    }
    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 0 0 28px;
    }
    /* Footer note */
    .footer-note {
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.6;
      text-align: center;
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px 20px;
    }
    .footer-note strong {
      color: #0f172a;
    }
    /* Page footer */
    .page-footer {
      text-align: center;
      padding: 20px 16px 32px;
      font-size: 0.75rem;
      color: #94a3b8;
      line-height: 1.6;
    }
    .page-footer a {
      color: #94a3b8;
      text-decoration: underline;
    }
    /* Mobile tweaks */
    @media only screen and (max-width: 480px) {
      .body { padding: 28px 24px 24px; }
      .header { padding: 28px 24px 22px; }
      .otp-code { font-size: 2rem; letter-spacing: 0.4em; }
      .otp-box { padding: 16px 28px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Card -->
    <div class="card">

      <!-- ── Header ── -->
      <div class="header">
        <div class="header-brand">
          <span class="brand-icon">⚕️</span>
          <span class="brand-name">DermaScan</span>
        </div>
        <div class="brand-tagline">AI-Powered Skin Analysis</div>
      </div>

      <!-- ── Body ── -->
      <div class="body">
        <div class="headline">${headline}</div>
        <p class="description">${body}</p>

        <div class="otp-label">Your verification code</div>
        <div class="otp-wrapper">
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
        </div>

        <hr class="divider" />

        <div class="footer-note">
          ⏱ <strong>This code expires in 2 minutes.</strong><br />
          If you did not request this, please ignore this email — your account is safe.
        </div>
      </div>
    </div>

    <!-- ── Page footer ── -->
    <div class="page-footer">
      © ${year} DermaScan AI &nbsp;·&nbsp; All rights reserved<br />
      This is an automated message — please do not reply directly to this email.
    </div>
  </div>
</body>
</html>`;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends an OTP email to the specified recipient.
 *
 * @param {string} to   Recipient email address
 * @param {string} otp  4-digit numeric OTP (plain text)
 * @param {'register'|'login'|'email_change'} type
 * @returns {Promise<void>}
 * @throws Will re-throw if the underlying nodemailer transport fails.
 */
const sendOtpEmail = async (to, otp, type) => {
  const transporter = createTransporter();
  const { subject } = getEmailCopy(type);
  const html = buildHtmlTemplate(otp, type);

  // Determine the "from" display name/address
  const from =
    process.env.SMTP_FROM ||
    `DermaScan AI <${process.env.EMAIL_USER || process.env.SMTP_USER}>`;

  const mailOptions = {
    from,
    to,
    subject,
    html,
    // Plain-text fallback for email clients that block HTML
    text: `Your DermaScan verification code is: ${otp}\n\nThis code expires in 2 minutes.\nIf you did not request this, please ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
};

// ---------------------------------------------------------------------------

module.exports = { createTransporter, sendOtpEmail };
