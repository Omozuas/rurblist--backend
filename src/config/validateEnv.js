const AppError = require('../utils/AppError');

const allowedNodeEnv = ['development', 'test', 'production'];
const allowedCookieSameSite = ['lax', 'strict', 'none'];

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

const booleanEnv = [
  'SMTP_SECURE',
  'SMTP_REQUIRE_TLS',
  'ENABLE_SELF_PING',
  'COOKIE_SECURE',
  'RETURN_REFRESH_TOKEN_IN_BODY',
];
const numericEnv = [
  'SMTP_PORT',
  'MONGO_MAX_POOL_SIZE',
  'MONGO_SERVER_SELECTION_TIMEOUT_MS',
  'DOJAH_TIMEOUT_MS',
  'EMAIL_TIMEOUT_MS',
  'PAYSTACK_TIMEOUT_MS',
  'UPLOAD_MAX_FILE_SIZE_BYTES',
  'UPLOAD_MAX_FILES',
  'SELF_PING_TIMEOUT_MS',
  'SHUTDOWN_TIMEOUT_MS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
  'MUTATION_RATE_LIMIT_WINDOW_MS',
  'MUTATION_RATE_LIMIT_MAX',
  'UPLOAD_RATE_LIMIT_WINDOW_MS',
  'UPLOAD_RATE_LIMIT_MAX',
  'PROPERTY_MUTATION_RATE_LIMIT_MAX',
  'PROPERTY_UPLOAD_RATE_LIMIT_MAX',
  'BUYER_VERIFICATION_UPLOAD_RATE_LIMIT_MAX',
  'AGENT_MUTATION_RATE_LIMIT_MAX',
  'AGENT_UPLOAD_RATE_LIMIT_MAX',
  'TOUR_MUTATION_RATE_LIMIT_MAX',
  'TOUR_MESSAGE_RATE_LIMIT_WINDOW_MS',
  'TOUR_MESSAGE_RATE_LIMIT_MAX',
  'VERIFICATION_MUTATION_RATE_LIMIT_MAX',
  'VERIFICATION_UPLOAD_RATE_LIMIT_MAX',
  'PAYMENT_MUTATION_RATE_LIMIT_WINDOW_MS',
  'PAYMENT_MUTATION_RATE_LIMIT_MAX',
  'PLAN_MUTATION_RATE_LIMIT_MAX',
  'USER_MUTATION_RATE_LIMIT_MAX',
  'USER_UPLOAD_RATE_LIMIT_MAX',
  'KYC_PROVIDER_RATE_LIMIT_WINDOW_MS',
  'KYC_PROVIDER_RATE_LIMIT_MAX',
  'ACCESS_TOKEN_COOKIE_MAX_AGE_MS',
  'REFRESH_TOKEN_COOKIE_MAX_AGE_MS',
  'PASSWORD_RESET_OTP_EXPIRES_MS',
  'EMAIL_OTP_EXPIRES_MS',
  'GOOGLE_LOGIN_TICKET_EXPIRES_MS',
];

function getEnv(key) {
  return (process.env[key] || '').trim();
}

function validateBooleanEnv(key) {
  const value = getEnv(key);

  if (!value) {
    return;
  }

  if (!['true', 'false'].includes(value.toLowerCase())) {
    throw new AppError(`${key} must be true or false`, 500);
  }
}

function validateNumericEnv(key) {
  const value = getEnv(key);

  if (!value) {
    return;
  }

  if (Number.isNaN(Number(value))) {
    throw new AppError(`${key} must be a number`, 500);
  }
}

function validateEmailProvider() {
  const hasBrevo = Boolean(getEnv('BREVO_API_KEY'));
  const hasSendGrid = Boolean(getEnv('SENDGRID_API_KEY'));
  const hasSmtp = Boolean(
    getEnv('SMTP_HOST') && getEnv('SMTP_USER') && getEnv('SMTP_PASSWORD') && getEnv('SMTP_PORT'),
  );

  if (!hasBrevo && !hasSendGrid && !hasSmtp) {
    throw new AppError(
      'Missing email provider config: set BREVO_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_PORT',
      500,
    );
  }
}

function validateNodeEnv() {
  const nodeEnv = getEnv('NODE_ENV') || 'development';

  if (!allowedNodeEnv.includes(nodeEnv)) {
    throw new AppError(`NODE_ENV must be one of: ${allowedNodeEnv.join(', ')}`, 500);
  }
}

function validateCookieConfig() {
  const nodeEnv = getEnv('NODE_ENV') || 'development';
  const sameSite = getEnv('COOKIE_SAME_SITE').toLowerCase();
  const cookieSecure = getEnv('COOKIE_SECURE').toLowerCase();

  if (sameSite && !allowedCookieSameSite.includes(sameSite)) {
    throw new AppError(`COOKIE_SAME_SITE must be one of: ${allowedCookieSameSite.join(', ')}`, 500);
  }

  if (sameSite === 'none' && cookieSecure !== 'true') {
    throw new AppError('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none', 500);
  }

  if (nodeEnv === 'production' && !getEnv('CORS_ORIGINS') && !getEnv('FRONTEND_URL')) {
    throw new AppError('Production requires FRONTEND_URL or CORS_ORIGINS', 500);
  }
}

function validateEnv() {
  const missing = requiredEnv.filter((key) => !getEnv(key));

  if (missing.length) {
    throw new AppError(`Missing required env vars: ${missing.join(', ')}`, 500);
  }

  validateNodeEnv();
  booleanEnv.forEach(validateBooleanEnv);
  numericEnv.forEach(validateNumericEnv);
  validateCookieConfig();
  validateEmailProvider();
}

module.exports = validateEnv;
