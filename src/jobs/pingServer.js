const axios = require('axios');
const cron = require('node-cron');

const enabled = process.env.ENABLE_SELF_PING === 'true';
const serverUrl = process.env.SERVER_URL;
const interval = process.env.SELF_PING_CRON || '*/14 * * * *';
const timeout = Number(process.env.SELF_PING_TIMEOUT_MS) || 10000;

if (!enabled) {
  console.log('[JOB] Self ping disabled.');
} else if (!serverUrl) {
  console.warn('[JOB] ENABLE_SELF_PING=true but SERVER_URL is not set.');
} else if (!cron.validate(interval)) {
  console.warn(`[JOB] Invalid SELF_PING_CRON "${interval}". Self ping disabled.`);
} else {
  const url = `${serverUrl.replace(/\/$/, '')}/home`;

  cron.schedule(interval, async () => {
    try {
      const response = await axios.get(url, { timeout });
      console.log(`[JOB] Self ping success: ${response.status} - ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[JOB] Self ping failed: ${error.message} - ${new Date().toISOString()}`);
    }
  });
}
