/**
 * emailService.js
 *
 * Production-grade Nodemailer email service for DermaScan AI.
 * Handles transactional email delivery for:
 *  - 'google_login': 2FA verification code after Google OAuth
 *  - 'login': Standard password 2FA verification code
 *  - 'register': New user email verification
 *  - 'email_change': Profile email update confirmation
 *  - 'password_reset': Password recovery code
 *
 * Resilience features:
 *  - Supports both EMAIL_* and SMTP_* environment variables.
 *  - Automatically strips spaces from Google App Passwords (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop").
 *  - Forces IPv4 (family: 4) to eliminate Node.js IPv6 connect hangs on cloud container networks.
 *  - Dual-port fallback: Tries port 465 (Direct SSL) first; falls back to port 587 (STARTTLS) on network errors.
 *  - Non-blocking startup validation banner for instant Render log diagnostics.
 *  - Zero credential or OTP leakage in logs or responses.
 */

const nodemailer = require('nodemailer');

/**
 * Reads, prioritizes, and sanitizes SMTP environment variables.
 */
const getSanitizedConfig = () => {
  const rawHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || '';
  const rawPort = process.env.EMAIL_PORT || process.env.SMTP_PORT || '';
  const rawUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
  const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || '';
  const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || '';

  const user = rawUser.trim();
  // Remove all whitespace, spaces, and accidental outer quotes from password
  const pass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  const isGmail = !rawHost || rawHost.includes('gmail') || user.endsWith('@gmail.com');

  const host = rawHost.trim() || (isGmail ? 'smtp.gmail.com' : 'smtp.gmail.com');
  const port = parseInt(rawPort, 10) || (isGmail ? 465 : 587);
  const secure = port === 465;

  const isPlaceholder = !pass || pass === 'your_gmail_app_password_here';

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: rawFrom.trim() || (user ? `DermaScan AI <${user}>` : 'DermaScan AI <noreply@dermascan.ai>'),
    isGmail,
    hasUser: !!user,
    hasPass: !!pass && !isPlaceholder,
    passLength: pass ? pass.length : 0,
    isPlaceholder,
  };
};

/**
 * Creates a nodemailer transporter with connection timeouts and IPv4 enforcement.
 */
const createTransporter = (portOverride = null, secureOverride = null) => {
  const config = getSanitizedConfig();
  const port = portOverride || config.port;
  const secure = secureOverride !== null ? secureOverride : port === 465;

  const transportOptions = {
    host: config.host,
    port,
    secure,
    family: 4, // Force IPv4 to prevent IPv6 DNS hangs on cloud container platforms
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  // If using port 587 with STARTTLS, require TLS
  if (port === 587) {
    transportOptions.requireTLS = true;
    transportOptions.tls = {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    };
  }

  return nodemailer.createTransport(transportOptions);
};

/**
 * Returns copy metadata for each verification flow.
 */
const getEmailCopy = (type) => {
  switch (type) {
    case 'google_login':
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Verify your email',
        badge: 'Google Sign-In Verification',
        body: 'You recently initiated sign-in to DermaScan AI with your Google account. Please enter the 4-digit verification code below to confirm your identity and complete your login.',
      };
    case 'login':
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Verify your email',
        badge: 'Secure Login Verification',
        body: 'A login attempt was initiated on your DermaScan AI account. Please enter the 4-digit verification code below to access your account portal.',
      };
    case 'register':
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Verify your email',
        badge: 'Account Registration',
        body: "Welcome to DermaScan AI. You're one step away from activating your account. Please use the 4-digit code below to confirm your email address.",
      };
    case 'email_change':
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Verify your email',
        badge: 'Email Address Update',
        body: 'We received a request to update the email address linked to your DermaScan AI account. Use the code below to confirm this change.',
      };
    case 'password_reset':
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Reset your password',
        badge: 'Password Recovery',
        body: 'We received a request to reset your password for DermaScan AI. Use the 4-digit verification code below to choose a new password.',
      };
    default:
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Verify your email',
        badge: 'Security Verification',
        body: 'Please use the 4-digit verification code below to complete your authentication request on DermaScan AI.',
      };
  }
};

/**
 * Builds responsive, accessible, clinical-grade HTML email template.
 */
const buildHtmlTemplate = (otp, type) => {
  const { headline, badge, body } = getEmailCopy(type);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>DermaScan AI — Verification Code</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 580px;
      margin: 32px auto;
      padding: 0 16px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
      padding: 32px 28px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      width: 44px;
      height: 44px;
      line-height: 44px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      font-size: 22px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 13px;
      color: #ccfbf1;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 36px 32px;
    }
    .tag {
      display: inline-block;
      padding: 4px 12px;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      color: #0f766e;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .content p {
      font-size: 15px;
      color: #475569;
      margin-bottom: 24px;
    }
    .otp-box {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 40px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 12px;
      padding-left: 12px;
    }
    .timer-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: #0f766e;
      font-weight: 600;
      margin-top: 10px;
    }
    .security-notice {
      background: #f1f5f9;
      border-left: 4px solid #0f766e;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      padding: 24px 16px;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">🔬</div>
        <h1>DermaScan AI</h1>
        <p>Clinical Skin Health Intelligence</p>
      </div>

      <div class="content">
        <span class="tag">${badge}</span>
        <h2>${headline}</h2>
        <p>${body}</p>

        <div class="otp-box">
          <div class="otp-label">Your 4-Digit Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="timer-notice">⏱️ This code expires in 5 minutes</div>
        </div>

        <div class="security-notice">
          <strong>Security Notice:</strong> If you did not request this verification code, you can safely ignore this email. Never share this code with anyone. DermaScan AI representatives will never ask for your code.
        </div>
      </div>
    </div>

    <div class="footer">
      <p>© ${year} DermaScan AI. All rights reserved.</p>
      <p style="margin-top: 4px;">Automated transactional message — please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Sends an OTP email to the specified recipient.
 * Tries primary transport (port 465 direct SSL) with automatic fallback to port 587.
 *
 * @param {string} to Recipient email address
 * @param {string} otp 4-digit plain numeric OTP
 * @param {'google_login'|'login'|'register'|'email_change'|'password_reset'} type
 * @returns {Promise<void>}
 */
const sendOtpEmail = async (to, otp, type = 'google_login') => {
  const config = getSanitizedConfig();

  // Validate configuration before attempting to send
  if (!config.hasUser || !config.hasPass) {
    const reason = !config.hasUser
      ? 'EMAIL_USER is not configured in Render environment.'
      : 'EMAIL_PASS is missing or set to placeholder in Render environment.';
    console.error(`[Email Service Error] Cannot dispatch OTP email: ${reason}`);
    throw new Error(`Email service unconfigured: ${reason}`);
  }

  const { subject } = getEmailCopy(type);
  const html = buildHtmlTemplate(otp, type);
  const mailOptions = {
    from: config.from,
    to,
    subject,
    html,
    text: `Your DermaScan AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email — your account remains secure.`,
  };

  // Primary attempt: Default configured port (465 for Gmail)
  try {
    const primaryTransporter = createTransporter();
    await primaryTransporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP successfully delivered to recipient via ${config.host}:${config.port} (${type})`);
    return;
  } catch (primaryErr) {
    console.warn(`[Email Service] Primary SMTP attempt (${config.host}:${config.port}) failed: ${primaryErr.code || primaryErr.message}`);

    // If authentication failed (EAUTH), fallback port will also fail — rethrow clean error
    if (primaryErr.code === 'EAUTH' || primaryErr.responseCode === 535) {
      console.error(`[Email Service] Gmail authentication failed (EAUTH). Verify your 16-character Google App Password in EMAIL_PASS.`);
      throw new Error('Gmail authentication failed (EAUTH). Please verify your 16-character Google App Password in EMAIL_PASS.');
    }

    // Secondary attempt: Fallback port (port 587 if 465 failed, or vice versa)
    const fallbackPort = config.port === 465 ? 587 : 465;
    try {
      console.log(`[Email Service] Retrying delivery with fallback transport on port ${fallbackPort}...`);
      const fallbackTransporter = createTransporter(fallbackPort, fallbackPort === 465);
      await fallbackTransporter.sendMail(mailOptions);
      console.log(`[Email Service] OTP successfully delivered via fallback port ${fallbackPort} (${type})`);
      return;
    } catch (fallbackErr) {
      console.error(`[Email Service] Fallback SMTP attempt on port ${fallbackPort} also failed: ${fallbackErr.code || fallbackErr.message}`);
      const errReason = fallbackErr.code ? `${fallbackErr.code}: ${fallbackErr.message}` : fallbackErr.message;
      throw new Error(`Failed to deliver verification email (${errReason}).`);
    }
  }
};

/**
 * Returns safe, sanitized diagnostic information for health checks and startup validation.
 * NEVER exposes the password or raw secrets.
 */
const getSmtpDiagnosticStatus = async () => {
  const config = getSanitizedConfig();
  const maskedSender = config.user
    ? (config.user.length > 5 ? `${config.user.slice(0, 3)}***@${config.user.split('@')[1] || ''}` : '***')
    : 'not set';

  const status = {
    configured: config.hasUser && config.hasPass,
    host: config.host,
    port: config.port,
    secure: config.secure,
    sender: maskedSender,
    hasUser: config.hasUser,
    hasPass: config.hasPass,
    passLength: config.passLength,
    isPlaceholder: config.isPlaceholder,
    verifyStatus: 'unverified',
    verifyMessage: '',
  };

  if (!status.configured) {
    status.verifyStatus = 'unconfigured';
    status.verifyMessage = !config.hasUser
      ? 'EMAIL_USER environment variable is missing.'
      : 'EMAIL_PASS is missing or using placeholder in Render.';
    return status;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    status.verifyStatus = 'connected';
    status.verifyMessage = 'SMTP handshake and authentication successful.';
  } catch (err) {
    status.verifyStatus = 'error';
    status.verifyMessage = err.code ? `${err.code}: ${err.message}` : err.message;
  }

  return status;
};

/**
 * Runs a non-blocking startup validation to log clear diagnostic instructions in Render logs.
 */
const verifySmtpOnStartup = () => {
  setTimeout(async () => {
    try {
      const diag = await getSmtpDiagnosticStatus();
      console.log('──────────────────────────────────────────────────────');
      console.log('[SMTP Diagnostic] Host:', diag.host, `(Port: ${diag.port}, SSL: ${diag.secure})`);
      console.log('[SMTP Diagnostic] User:', diag.sender, `| Password configured: ${diag.hasPass} (${diag.passLength} chars)`);

      if (diag.isPlaceholder) {
        console.warn('[SMTP WARNING] EMAIL_PASS is set to "your_gmail_app_password_here" placeholder!');
        console.warn('[SMTP WARNING] Please set your 16-character Google App Password in Render Environment.');
      } else if (diag.verifyStatus === 'connected') {
        console.log('[SMTP Diagnostic] Status: CONNECTED & READY (Authentication succeeded)');
      } else if (diag.verifyStatus === 'error') {
        console.error('[SMTP ERROR] Handshake failed:', diag.verifyMessage);
        if (diag.verifyMessage.includes('EAUTH') || diag.verifyMessage.includes('535')) {
          console.error('[SMTP HELP] Gmail rejected login. In Google Account -> Security -> 2-Step Verification -> App Passwords, generate a 16-character password and save in Render as EMAIL_PASS.');
        }
      }
      console.log('──────────────────────────────────────────────────────');
    } catch (e) {
      console.error('[SMTP Startup Check Error]', e.message);
    }
  }, 1500);
};

module.exports = {
  createTransporter,
  sendOtpEmail,
  getSmtpDiagnosticStatus,
  verifySmtpOnStartup,
  getSanitizedConfig,
};
