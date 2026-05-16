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
  'ADMIN_EMAIL',
  'DOJAH_BASE_URL',
  'DOJAH_APP_ID',
  'DOJAH_SECRET_KEY',
  'DOJAH_PUBLIC_KEY',
];

const booleanEnv = ['SMTP_SECURE', 'SMTP_REQUIRE_TLS', 'ENABLE_SELF_PING'];
const numericEnv = [
  'SMTP_PORT',
  'MONGO_MAX_POOL_SIZE',
  'MONGO_SERVER_SELECTION_TIMEOUT_MS',
  'DOJAH_TIMEOUT_MS',
  'EMAIL_TIMEOUT_MS',
  'UPLOAD_MAX_FILE_SIZE_BYTES',
  'UPLOAD_MAX_FILES',
  'SELF_PING_TIMEOUT_MS',
];

function validateBooleanEnv(key) {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return;
  }

  if (!['true', 'false'].includes(value.toLowerCase())) {
    throw new Error(`${key} must be true or false`);
  }
}

function validateNumericEnv(key) {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return;
  }

  if (Number.isNaN(Number(value))) {
    throw new Error(`${key} must be a number`);
  }
}

function validateEmailProvider() {
  const hasBrevo = Boolean(process.env.BREVO_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_PORT,
  );

  if (!hasBrevo && !hasSendGrid && !hasSmtp) {
    throw new Error(
      'Missing email provider config: set BREVO_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_PORT',
    );
  }
}

function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  booleanEnv.forEach(validateBooleanEnv);
  numericEnv.forEach(validateNumericEnv);
  validateEmailProvider();
}

module.exports = validateEnv;
