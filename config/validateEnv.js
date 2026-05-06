const requiredEnv = [
  'MONG_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SH_KEY',
  'FRONTEND_URL',
  'PAYSTACK_BASE_URL',
  'PAYSTACK_SECRET_KEY',
  'CLOUD_NAME',
  'CLOUD_API_KEY',
  'CLOUD_SECRET_API_KEY',
  'EMAIL_VERIFY',
  'EMAIL_SUPPORT',
  'EMAIL_HELLO',
  'BREVO_API_KEY',
  'ADMIN_EMAIL',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_REQUIRE_TLS',
  'DOJAH_BASE_URL',
  'DOJAH_APP_ID',
  'DOJAH_SECRET_KEY',
  'DOJAH_PUBLIC_KEY',
];

function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const hasBrevo = Boolean(process.env.BREVO_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const hasSmtp = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
  );

  if (!hasBrevo && !hasSendGrid && !hasSmtp) {
    throw new Error(
      'Missing email provider config: set BREVO_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASSWORD',
    );
  }
}

module.exports = validateEnv;
