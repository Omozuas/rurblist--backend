const cron = require('node-cron');
const axios = require('axios');

const URL = process.env.SERVER_URL ? `${process.env.SERVER_URL}/home` : null;

if (!URL) {
  console.warn('[CRON] SERVER_URL not set. Ping cron disabled.');
  return;
}

// Run every 14 minutes
cron.schedule('*/14 * * * *', async () => {
  try {
    const res = await axios.get(URL);
    console.log(`[CRON] Ping success: ${res.status} - ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[CRON] Ping failed: ${error.message} - ${new Date().toISOString()}`);
  }
});
