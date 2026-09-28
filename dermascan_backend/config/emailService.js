/**
 * emailService.js
 *
 * Production-grade Transactional Email Service for DermaScan AI
 * powered by Brevo (formerly Sendinblue) Transactional Email API.
 *
 * NETWORK ARCHITECTURE:
 *  - Communicates strictly over HTTPS (Port 443) via the official @getbrevo/brevo SDK
 *    and direct REST API (https://api.brevo.com/v3/smtp/email).
 *  - 100% compliant with Render Free Tier (bypasses all cloud container SMTP firewall blocks).
 *  - Supports arbitrary recipient emails on the free tier with a single verified sender.
 *  - $0/month, no credit card required, up to 300 free emails/day.
 *
 * SECURITY:
 *  - Zero secret or OTP leakage (BREVO_API_KEY is never logged or returned in responses).
 *  - Plaintext OTP is never logged.
 *  - Safe diagnostic metadata exposed for /health endpoint.
 */

const { BrevoClient } = require('@getbrevo/brevo');
const axios = require('axios');

/**
 * Sanitizes and loads Brevo email configuration from process.env.
 */
const getSanitizedConfig = () => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'DermaScan AI').trim();

  const isPlaceholder = !apiKey || apiKey.startsWith('your_') || apiKey === 'xkeysib-placeholder';
  const hasKey = Boolean(apiKey && !isPlaceholder);
  const hasSender = Boolean(senderEmail && senderEmail.includes('@'));

  const configured = Boolean(hasKey && hasSender);

  return {
    provider: 'brevo',
    protocol: 'https',
    host: 'api.brevo.com',
    port: 443,
    apiKey,
    hasKey,
    senderEmail,
    senderName,
    sender: hasSender ? `${senderName} <${senderEmail}>` : 'unconfigured',
    configured,
    isPlaceholder,
    keyLength: apiKey ? apiKey.length : 0,
    // Backwards-compatible flags
    hasUser: configured,
    hasPass: configured,
  };
};

/**
 * Subject lines and copy metadata for each transactional email flow.
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
 * Responsive clinical HTML email template for 4-digit OTP delivery.
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
 * Sends an OTP email to the specified recipient using Brevo Transactional Email API over HTTPS (Port 443).
 *
 * @param {string} to Recipient email address (verified Google email)
 * @param {string} otp 4-digit plain numeric OTP
 * @param {'google_login'|'login'|'register'|'email_change'|'password_reset'} type
 * @returns {Promise<{ success: boolean, id: string }>}
 */
const sendOtpEmail = async (to, otp, type = 'google_login') => {
  const config = getSanitizedConfig();

  if (!config.configured) {
    const reason = !config.hasKey
      ? 'BREVO_API_KEY is not configured or is using a placeholder in environment.'
      : 'BREVO_SENDER_EMAIL is not configured in environment.';
    console.error(`[Email Service Error] Cannot dispatch OTP: ${reason}`);
    throw new Error(`Email service unconfigured: ${reason}`);
  }

  const { subject } = getEmailCopy(type);
  const htmlContent = buildHtmlTemplate(otp, type);
  const textContent = `Your DermaScan AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email — your account remains secure.`;

  // 1. Primary method: Official BrevoClient SDK over HTTPS
  try {
    const brevo = new BrevoClient({ apiKey: config.apiKey });
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: config.senderName,
        email: config.senderEmail,
      },
      to: [
        {
          email: to.trim().toLowerCase(),
        },
      ],
      subject,
      htmlContent,
      textContent,
    });

    const messageId = response.data?.messageId || response.messageId || 'sent';
    console.log(`[Email Service] OTP email dispatched via Brevo API (ID: ${messageId}) to ${to} [${type}]`);
    return { success: true, id: messageId };
  } catch (sdkErr) {
    console.warn('[Email Service] Brevo SDK call failed, attempting direct HTTPS REST fallback:', sdkErr.message);

    // 2. Direct HTTPS REST API fallback (Port 443)
    try {
      const restResponse = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: config.senderName,
            email: config.senderEmail,
          },
          to: [
            {
              email: to.trim().toLowerCase(),
            },
          ],
          subject,
          htmlContent,
          textContent,
        },
        {
          headers: {
            'api-key': config.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );

      const messageId = restResponse.data?.messageId || 'sent';
      console.log(`[Email Service] OTP email dispatched via Brevo REST API (ID: ${messageId}) to ${to} [${type}]`);
      return { success: true, id: messageId };
    } catch (restErr) {
      const apiMessage =
        restErr.response?.data?.message ||
        restErr.response?.data?.error ||
        restErr.message;
      console.error('[Email Service] Brevo API rejected request:', apiMessage);
      throw new Error(`Failed to deliver verification email: ${apiMessage}`);
    }
  }
};

/**
 * Returns safe diagnostic information for the /health endpoint.
 * Zero secret leakage.
 */
const getSmtpDiagnosticStatus = async () => {
  const config = getSanitizedConfig();

  return {
    configured: config.configured,
    provider: 'brevo',
    protocol: 'https',
    host: 'api.brevo.com',
    port: 443,
    secure: true,
    sender: config.sender,
    hasApiKey: config.hasKey,
    keyLength: config.keyLength,
    isPlaceholder: config.isPlaceholder,
    verifyStatus: config.configured ? 'ready' : 'unconfigured',
    verifyMessage: config.configured
      ? `Brevo HTTPS Transactional Email API ready on port 443 (Sender: ${config.sender}).`
      : 'BREVO_API_KEY or BREVO_SENDER_EMAIL missing in Render environment.',
  };
};

/**
 * Non-blocking startup diagnostic check.
 */
const verifySmtpOnStartup = () => {
  setTimeout(() => {
    const config = getSanitizedConfig();
    console.log('──────────────────────────────────────────────────────');
    console.log('[Email Service Diagnostic] Active Provider: BREVO (HTTPS Port 443)');
    console.log(`[Email Service Diagnostic] Sender: ${config.sender}`);
    console.log(`[Email Service Diagnostic] BREVO_API_KEY configured: ${config.hasKey} (${config.keyLength} chars)`);

    if (config.configured) {
      console.log('[Email Service Diagnostic] Status: BREVO API READY & ACTIVE (Arbitrary Recipients Supported)');
    } else {
      console.warn('[Email Service WARNING] Brevo configuration is incomplete. Add BREVO_API_KEY and BREVO_SENDER_EMAIL to Render environment.');
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
