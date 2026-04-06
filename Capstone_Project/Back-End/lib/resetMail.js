/**
 * Sends password-reset email when SMTP_* env vars are set; otherwise logs the link to the console.
 * On AWS (EC2): set APP_BASE_URL to your public URL (Elastic IP, load balancer, or domain) so reset
 * links work for users. Use Amazon SES SMTP credentials in SMTP_* for production email.
 */
const nodemailer = require('nodemailer');

function baseUrl() {
  const fromEnv = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const port = process.env.PORT || 3000;
  return 'http://localhost:' + port;
}

async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = baseUrl() + '/client/Client_ResetPassword.html?token=' + encodeURIComponent(token);
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log('[password reset] Email (SMTP not configured):', to);
    console.log('[password reset] Reset link:', resetUrl);
    return;
  }
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true';
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
        : undefined,
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your Houston Badminton Center password',
    text:
      'Use the link below to set a new password (expires in 1 hour).\n\n' + resetUrl + '\n',
    html:
      '<p>Use the link below to set a new password (expires in 1 hour).</p>' +
      '<p><a href="' +
      resetUrl +
      '">' +
      resetUrl +
      '</a></p>',
  });
}

module.exports = { sendPasswordResetEmail, baseUrl };
