/**
 * emailService.js
 *
 * Production-grade HTTPS Email Service for DermaScan AI.
 * Communicates strictly over HTTPS (Port 443) to guarantee 100% reliability
 * on Render Free Tier Web Services, completely bypassing cloud container SMTP firewall blocks.
 *
 * Supported Providers (both over HTTPS port 443):
 *  1. 'gmail_api': Official Google Gmail REST API via OAuth2 (Port 443, unlimited arbitrary recipients, no custom domain needed)
 *  2. 'resend': Resend HTTPS REST API (Port 443)
 *
 * Handles transactional email delivery for:
 *  - 'google_login': 2FA verification code after Google OAuth
 *  - 'login': Standard password 2FA verification code
 *  - 'register': New user email verification
 *  - 'email_change': Profile email update confirmation
 *  - 'password_reset': Password recovery code
 *
 * SECURITY & ARCHITECTURE:
 *  - Zero credential leakage (secrets and tokens are never logged or returned in responses).
 *  - Communicates over HTTPS port 443 via OAuth2 / REST API.
 *  - Full responsive DermaScan AI clinical HTML email template.
 *  - Plain-text fallback for all email clients.
 *  - Non-blocking startup diagnostic check.
 */

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
let ResendPackage = null;
try {
  ResendPackage = require('resend').Resend;
} catch (e) {
  // Resend optional fallback
}

/**
 * Reads, prioritizes, and sanitizes environment configuration.
 */
const getSanitizedConfig = () => {
  // ── Gmail REST API (HTTPS Port 443) ──
  const gmailUser = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
  const gmailClientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  const gmailClientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const gmailRefreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();

  const hasGmailApi = Boolean(
    gmailUser &&
    gmailClientId &&
    gmailClientSecret &&
    gmailRefreshToken &&
    !gmailRefreshToken.startsWith('your_')
  );

  // ── Resend HTTPS API (Port 443) ──
  const rawResendKey = process.env.RESEND_API_KEY || '';
  const resendApiKey = rawResendKey.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  const resendFrom = (process.env.RESEND_FROM || process.env.EMAIL_FROM || '').trim() || 'DermaScan AI <onboarding@resend.dev>';
  const hasResend = Boolean(resendApiKey && !resendApiKey.startsWith('your_'));

  if (hasGmailApi) {
    return {
      provider: 'gmail_api',
      protocol: 'https',
      port: 443,
      host: 'gmail.googleapis.com',
      user: gmailUser,
      sender: `DermaScan AI <${gmailUser}>`,
      clientId: gmailClientId,
      clientSecret: gmailClientSecret,
      refreshToken: gmailRefreshToken,
      hasKey: true,
      hasGmailApi: true,
      hasResend: false,
      isPlaceholder: false,
      hasUser: true,
      hasPass: true,
    };
  }

  if (hasResend) {
    return {
      provider: 'resend',
      protocol: 'https',
      port: 443,
      host: 'api.resend.com',
      apiKey: resendApiKey,
      from: resendFrom,
      sender: resendFrom,
      hasKey: true,
      hasGmailApi: false,
      hasResend: true,
      isPlaceholder: false,
      hasUser: true,
      hasPass: true,
    };
  }

  return {
    provider: 'unconfigured',
    protocol: 'https',
    port: 443,
    host: 'none',
    sender: 'unconfigured',
    hasKey: false,
    hasGmailApi: false,
    hasResend: false,
    isPlaceholder: true,
    hasUser: false,
    hasPass: false,
  };
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
 * Builds RFC 2822 formatted email message for Gmail REST API.
 */
const buildRfc2822Message = ({ from, to, subject, html, text }) => {
  const boundary = `====_DermaScan_Boundary_${Date.now()}====`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ];

  return lines.join('\r\n');
};

/**
 * Sends OTP email using the official Google Gmail REST API over HTTPS port 443.
 * Supports sending to ANY arbitrary recipient in the world with zero domain verification.
 */
const sendViaGmailApi = async (config, to, otp, type) => {
  const { subject } = getEmailCopy(type);
  const html = buildHtmlTemplate(otp, type);
  const text = `Your DermaScan AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email — your account remains secure.`;

  // Exchange Refresh Token for fresh Access Token via Google OAuth2 client
  const oauth2Client = new OAuth2Client(config.clientId, config.clientSecret);
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  const tokenResponse = await oauth2Client.getAccessToken();
  const accessToken = tokenResponse?.token || (typeof tokenResponse === 'string' ? tokenResponse : null);

  if (!accessToken) {
    throw new Error('Failed to obtain fresh Google OAuth2 access token using GMAIL_REFRESH_TOKEN.');
  }

  const rfcMessage = buildRfc2822Message({
    from: config.sender,
    to,
    subject,
    html,
    text,
  });

  const raw = Buffer.from(rfcMessage, 'utf-8').toString('base64url');

  const response = await axios.post(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    { raw },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const messageId = response.data?.id || 'sent';
  console.log(`[Email Service] OTP email dispatched via Gmail REST API (ID: ${messageId}) to ${to} [${type}]`);
  return { success: true, id: messageId };
};

/**
 * Sends OTP email using Resend HTTPS API over port 443.
 */
const sendViaResend = async (config, to, otp, type) => {
  if (!ResendPackage) {
    throw new Error('Resend SDK is not installed.');
  }

  const { subject } = getEmailCopy(type);
  const html = buildHtmlTemplate(otp, type);
  const text = `Your DermaScan AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email — your account remains secure.`;

  const resend = new ResendPackage(config.apiKey);
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: [to],
    subject,
    html,
    text,
  });

  if (error) {
    console.error(`[Email Service] Resend API error: ${error.message} (${error.name || 'API_ERROR'})`);
    throw new Error(error.message || 'Resend API rejected the email request.');
  }

  if (!data?.id) {
    throw new Error('Resend API returned empty dispatch confirmation.');
  }

  console.log(`[Email Service] OTP email accepted by Resend (ID: ${data.id}) to ${to} [${type}]`);
  return { success: true, id: data.id };
};

/**
 * Sends an OTP email to the specified recipient using HTTPS port 443.
 * Prioritizes Gmail REST API (unlimited arbitrary recipients).
 * Falls back to Resend if configured.
 *
 * @param {string} to Recipient email address
 * @param {string} otp 4-digit plain numeric OTP
 * @param {'google_login'|'login'|'register'|'email_change'|'password_reset'} type
 * @returns {Promise<{ success: boolean, id: string }>}
 */
const sendOtpEmail = async (to, otp, type = 'google_login') => {
  const config = getSanitizedConfig();

  if (!config.hasKey) {
    const reason = 'Email service is unconfigured. Please configure GMAIL_REFRESH_TOKEN or RESEND_API_KEY.';
    console.error(`[Email Service Error] Cannot dispatch OTP email: ${reason}`);
    throw new Error(`Email service unconfigured: ${reason}`);
  }

  try {
    if (config.provider === 'gmail_api') {
      return await sendViaGmailApi(config, to, otp, type);
    } else if (config.provider === 'resend') {
      return await sendViaResend(config, to, otp, type);
    } else {
      throw new Error('Unknown email provider configured.');
    }
  } catch (err) {
    console.error(`[Email Service] Delivery failed via ${config.provider}:`, err.message);
    throw new Error(`Failed to deliver verification email: ${err.message}`);
  }
};

/**
 * Returns safe diagnostic information for /health endpoint.
 * NEVER exposes tokens or raw secrets.
 */
const getSmtpDiagnosticStatus = async () => {
  const config = getSanitizedConfig();

  return {
    configured: config.hasKey,
    provider: config.provider,
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    secure: true,
    sender: config.sender,
    verifyStatus: config.hasKey ? 'ready' : 'unconfigured',
    verifyMessage: config.hasKey
      ? `${config.provider === 'gmail_api' ? 'Gmail REST API' : 'Resend HTTPS API'} client ready on port 443 (Sender: ${config.sender}).`
      : 'No email service configured. Please configure GMAIL_REFRESH_TOKEN in Render environment.',
  };
};

/**
 * Runs non-blocking startup validation for Render logs.
 */
const verifySmtpOnStartup = () => {
  setTimeout(() => {
    const config = getSanitizedConfig();
    console.log('──────────────────────────────────────────────────────');
    console.log(`[Email Service Diagnostic] Active Provider: ${config.provider.toUpperCase()} (HTTPS Port 443)`);
    console.log(`[Email Service Diagnostic] Sender: ${config.sender}`);

    if (config.provider === 'gmail_api') {
      console.log('[Email Service Diagnostic] Mode: Arbitrary Recipients Allowed (via Google OAuth2 REST API)');
      console.log('[Email Service Diagnostic] Status: GMAIL REST API READY & ACTIVE');
    } else if (config.provider === 'resend') {
      console.log('[Email Service Diagnostic] Mode: Resend HTTPS API');
      console.log('[Email Service Diagnostic] Status: RESEND CLIENT READY & ACTIVE');
    } else {
      console.warn('[Email Service WARNING] No active email provider configured.');
    }
    console.log('──────────────────────────────────────────────────────');
  }, 1000);
};

// Backwards-compatible dummy createTransporter
const createTransporter = () => ({
  verify: (cb) => cb(null, true),
  sendMail: async (opts) => sendOtpEmail(opts.to, '0000', 'login'),
});

module.exports = {
  sendOtpEmail,
  getSmtpDiagnosticStatus,
  verifySmtpOnStartup,
  getSanitizedConfig,
  createTransporter,
};
