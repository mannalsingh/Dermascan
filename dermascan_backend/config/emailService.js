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
 * STRICT PRODUCTION NETWORK & IPV4 ENFORCEMENT:
 *  1. Node.js DNS default result order set to IPv4-first.
 *  2. Nodemailer's internal resolver (shared.resolveHostname) patched to resolve
 *     IPv4 (AF_INET) ONLY. This completely eliminates IPv6 addresses from
 *     Nodemailer's connection attempt list and fallback address array, preventing
 *     "ESOCKET: connect ENETUNREACH 2607:... - Local (:::0)" on Render containers.
 *  3. Connects strictly to smtp.gmail.com on PORT 465 using implicit TLS (secure: true).
 *  4. NO PORT 587. NO FALLBACK TO PORT 587.
 *  5. Strict production timeouts (8-10 seconds) so network errors fail immediately.
 *  6. Strips whitespace from Google App Passwords automatically.
 *  7. Exposes safe diagnostics for /health without leaking credentials or OTPs.
 */

const dns = require('dns');
const nodemailer = require('nodemailer');

// 1. Force Node.js DNS to prioritize IPv4 at process level
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// 2. Intercept Nodemailer's internal hostname resolver to GUARANTEE IPv4-only resolution.
// By default, Nodemailer queries both IPv4 and IPv6, appending IPv6 to fallback addresses.
// On cloud containers with no IPv6 route, connecting to those fallbacks throws ENETUNREACH.
// This patch ensures only verified IPv4 addresses are returned.
try {
  const shared = require('nodemailer/lib/shared');
  if (shared && typeof shared.resolveHostname === 'function') {
    shared.resolveHostname = function (options, callback) {
      options = options || {};
      const host = options.host || 'smtp.gmail.com';
      const servername = options.servername || host;

      dns.lookup(host, { family: 4, all: true }, (err, addresses) => {
        if (err) {
          console.error(`[SMTP IPv4 Resolver] Failed to resolve ${host} to IPv4:`, err.message);
          return callback(err);
        }

        const ipv4List = Array.isArray(addresses)
          ? addresses.filter(a => a && (a.family === 4 || a.family === 'IPv4')).map(a => a.address)
          : [addresses];

        if (!ipv4List.length) {
          return callback(new Error(`No IPv4 address resolved for ${host}`));
        }

        return callback(null, {
          host: ipv4List[0],
          servername,
          cached: false,
          _addresses: ipv4List, // Only IPv4 fallbacks
        });
      });
    };
  }
} catch (patchErr) {
  console.warn('[SMTP Resolver Patch] Could not patch internal resolver:', patchErr.message);
}

/**
 * Reads, prioritizes, and sanitizes SMTP environment variables.
 * Enforces port 465 with implicit TLS for Gmail.
 */
const getSanitizedConfig = () => {
  const rawHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || '';
  const rawPort = process.env.EMAIL_PORT || process.env.SMTP_PORT || '';
  const rawUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
  const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || '';
  const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || '';

  const user = rawUser.trim();
  // Strip all whitespace, spaces, newlines, and surrounding quotes from Google App Password
  const pass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  const isGmail = !rawHost || rawHost.includes('gmail') || user.endsWith('@gmail.com');

  // STRICT REQUIREMENT: Gmail uses smtp.gmail.com on port 465 with implicit TLS
  const host = isGmail ? 'smtp.gmail.com' : (rawHost.trim() || 'smtp.gmail.com');
  const port = isGmail ? 465 : (parseInt(rawPort, 10) || 465);
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
 * Creates an explicit Nodemailer transporter using implicit TLS on port 465 over IPv4.
 * NO port 587. NO service: "gmail" shortcut.
 */
const createTransporter = () => {
  const config = getSanitizedConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 8000, // 8s
    greetingTimeout: 8000,   // 8s
    socketTimeout: 10000,    // 10s
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      servername: config.host,
    },
  });
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
        badge: 'Google Sign-In 2FA',
        body: 'You are signing in to DermaScan AI with your Google account. Please use the 4-digit verification code below to confirm your identity.',
      };
    case 'login':
      return {
        subject: 'Your DermaScan AI login code',
        headline: 'Two-Factor Authentication',
        badge: 'Account Security',
        body: 'A sign-in attempt was initiated for your DermaScan AI account. Use the 4-digit security code below to complete your sign in.',
      };
    case 'register':
      return {
        subject: 'Verify your DermaScan AI account',
        headline: 'Welcome to DermaScan AI',
        badge: 'Account Activation',
        body: 'Thank you for registering. Please enter the 4-digit code below to verify your email address and activate your account.',
      };
    case 'email_change':
      return {
        subject: 'Confirm your new email - DermaScan AI',
        headline: 'Confirm Email Change',
        badge: 'Profile Update',
        body: 'You requested to update your DermaScan AI account email. Enter the 4-digit code below to verify this new email address.',
      };
    case 'password_reset':
      return {
        subject: 'DermaScan AI - Password Reset Code',
        headline: 'Reset Your Password',
        badge: 'Account Recovery',
        body: 'We received a request to reset your password. Use the 4-digit verification code below to proceed with setting a new password.',
      };
    default:
      return {
        subject: 'Your DermaScan AI verification code',
        headline: 'Security Verification',
        badge: 'DermaScan AI',
        body: 'Please use the 4-digit verification code below to proceed.',
      };
  }
};

/**
 * Responsive HTML email template for 4-digit OTP delivery.
 */
const buildHtmlTemplate = (otp, type) => {
  const { headline, badge, body } = getEmailCopy(type);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #f4faf9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #334e68;
      padding: 32px 16px;
    }
    .wrapper { max-width: 520px; margin: 0 auto; }
    .card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2eceb;
      box-shadow: 0 4px 20px -2px rgba(16, 42, 67, 0.06);
      overflow: hidden;
    }
    .header {
      background: #0f9d92;
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 8px;
    }
    .header p {
      font-size: 12px;
      color: #e0f2fe;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .content { padding: 36px 32px; }
    .tag {
      display: inline-block;
      padding: 4px 12px;
      background: #f4faf9;
      border: 1px solid #e2eceb;
      color: #0f9d92;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #102a43;
      margin-bottom: 12px;
    }
    .content p {
      font-size: 15px;
      color: #334e68;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .otp-box {
      background: #f4faf9;
      border: 2px dashed #0f9d92;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 600;
      color: #627d98;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 42px;
      font-weight: 800;
      color: #0f9d92;
      letter-spacing: 12px;
      padding-left: 12px;
    }
    .timer-notice {
      font-size: 13px;
      color: #0f9d92;
      font-weight: 600;
      margin-top: 10px;
    }
    .security-notice {
      background: #f8fafc;
      border-left: 4px solid #0f9d92;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
      margin-top: 24px;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      padding: 24px 16px;
      font-size: 12px;
      color: #829ab1;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
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
 * Connects exclusively via smtp.gmail.com:465 with implicit TLS over IPv4.
 * NO FALLBACK TO PORT 587.
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

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP successfully delivered to recipient via ${config.host}:${config.port} [IPv4 TLS] (${type})`);
  } catch (err) {
    console.error(`[Email Service] SMTP dispatch failed (${config.host}:${config.port}):`, err.code ? `${err.code}: ${err.message}` : err.message);

    if (err.code === 'EAUTH' || err.responseCode === 535) {
      throw new Error('Gmail authentication failed (EAUTH). Verify your 16-character Google App Password in EMAIL_PASS on Render.');
    }

    const errReason = err.code ? `${err.code}: ${err.message}` : err.message;
    throw new Error(`Failed to deliver verification email (${errReason}).`);
  }
};

/**
 * Returns safe, sanitized diagnostic information for health checks and startup validation.
 * Reports resolved IPv4 address and connection state.
 * NEVER exposes the password or raw secrets.
 */
const getSmtpDiagnosticStatus = async () => {
  const config = getSanitizedConfig();

  // Explicit IPv4 DNS resolution for diagnostics
  let resolvedIp = 'unresolved';
  let ipFamily = 4;
  try {
    const dnsResult = await new Promise((resolve, reject) => {
      dns.lookup(config.host, { family: 4 }, (err, address, family) => {
        if (err) reject(err);
        else resolve({ address, family });
      });
    });
    resolvedIp = dnsResult.address;
    ipFamily = dnsResult.family;
  } catch (dnsErr) {
    resolvedIp = `DNS Error: ${dnsErr.message}`;
  }

  const maskedSender = config.user
    ? (config.user.length > 5 ? `${config.user.slice(0, 3)}***@${config.user.split('@')[1] || ''}` : '***')
    : 'not set';

  const status = {
    configured: config.hasUser && config.hasPass,
    host: config.host,
    port: config.port,
    secure: config.secure,
    ipFamily,
    resolvedIp,
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
    status.verifyMessage = `SMTP handshake and authentication successful over IPv4 (${resolvedIp}:${config.port}).`;
  } catch (err) {
    status.verifyStatus = 'error';
    status.verifyMessage = err.code ? `${err.code}: ${err.message}` : err.message;
  }

  return status;
};

/**
 * Runs non-blocking startup validation to log clear IPv4 diagnostic status in Render logs.
 */
const verifySmtpOnStartup = () => {
  setTimeout(async () => {
    try {
      const diag = await getSmtpDiagnosticStatus();
      console.log('──────────────────────────────────────────────────────');
      console.log(`[SMTP Diagnostic] Host: ${diag.host} -> ${diag.resolvedIp} (IPv${diag.ipFamily}, Port: ${diag.port}, SSL: ${diag.secure})`);
      console.log(`[SMTP Diagnostic] Sender: ${diag.sender} | Password configured: ${diag.hasPass} (${diag.passLength} chars)`);

      if (diag.isPlaceholder) {
        console.warn('[SMTP WARNING] EMAIL_PASS is set to "your_gmail_app_password_here" placeholder!');
        console.warn('[SMTP WARNING] Please set your 16-character Google App Password in Render Environment.');
      } else if (diag.verifyStatus === 'connected') {
        console.log(`[SMTP Diagnostic] Status: CONNECTED & READY over IPv4 (${diag.resolvedIp})`);
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
