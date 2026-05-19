const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 6003;
const baseUrl = (process.env.SMOKE_BASE_URL || process.env.SERVER_URL || `http://localhost:${port}`)
  .replace(/\/$/, '');
const timeout = Number(process.env.SMOKE_TIMEOUT_MS) || 10000;

const client = axios.create({
  baseURL: baseUrl,
  timeout,
  validateStatus: () => true,
});
const isProduction = (process.env.NODE_ENV || '').trim() === 'production';

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name}${detail ? ` - ${detail}` : ''}`);
}

async function expectStatus(name, request, expectedStatuses) {
  try {
    const response = await request();
    const allowed = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
    const passed = allowed.includes(response.status);

    record(name, passed, `HTTP ${response.status}`);
    return response;
  } catch (error) {
    record(name, false, error.message);
    return null;
  }
}

function hasValidationErrors(response) {
  return Boolean(
    response &&
      response.status === 400 &&
      response.data &&
      response.data.success === false &&
      response.data.status === 'fail' &&
      response.data.code === 'VALIDATION_FAILED' &&
      Array.isArray(response.data.errors) &&
      response.data.errors.length > 0,
  );
}

function hasUnauthorizedShape(response) {
  return Boolean(
    response &&
      response.status === 401 &&
      response.data &&
      response.data.success === false &&
      response.data.status === 'fail' &&
      typeof response.data.message === 'string' &&
      !response.data.details &&
      (!isProduction || !response.data.stack),
  );
}

async function run() {
  await expectStatus('GET /health', () => client.get('/health'), 200);
  await expectStatus('GET /readiness', () => client.get('/readiness'), 200);

  const registerValidationResponse = await expectStatus(
    'POST /api/v1/auth/register validation',
    () => client.post('/api/v1/auth/register', {}),
    400,
  );

  record(
    'auth validation returns field errors',
    hasValidationErrors(registerValidationResponse),
    'expects code=VALIDATION_FAILED and errors[]',
  );

  const protectedResponse = await expectStatus(
    'GET /api/v1/user/me without token',
    () => client.get('/api/v1/user/me'),
    401,
  );

  record(
    'protected route returns safe 401 shape',
    hasUnauthorizedShape(protectedResponse),
    isProduction
      ? 'expects fail response without stack/details'
      : 'expects fail response without details',
  );

  const smokeEmail = process.env.SMOKE_LOGIN_EMAIL;
  const smokePassword = process.env.SMOKE_LOGIN_PASSWORD;

  if (!smokeEmail || !smokePassword) {
    record('POST /api/v1/auth/login + GET /api/v1/user/me', true, 'skipped: set SMOKE_LOGIN_EMAIL and SMOKE_LOGIN_PASSWORD to run authenticated smoke');
  } else {
    const loginResponse = await expectStatus(
      'POST /api/v1/auth/login',
      () =>
        client.post('/api/v1/auth/login', {
          email: smokeEmail,
          password: smokePassword,
        }),
      200,
    );

    const accessToken = loginResponse?.data?.data?.accessToken;

    if (!accessToken) {
      record('GET /api/v1/user/me', false, 'skipped: login did not return access token');
    } else {
      await expectStatus(
        'GET /api/v1/user/me',
        () =>
          client.get('/api/v1/user/me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        200,
      );
    }
  }

  const failed = results.filter((result) => !result.passed);

  if (failed.length) {
    console.error(`Smoke test failed: ${failed.length}/${results.length} checks failed.`);
    process.exit(1);
  }

  console.log(`Smoke test passed: ${results.length}/${results.length} checks passed.`);
}

run().catch((error) => {
  console.error('Smoke test crashed:', error.message);
  process.exit(1);
});
