const cron = require('node-cron');
const axios = require('axios');

const URL = process.env.SERVER_URL + '/home';

// Run every 10 minutes
cron.schedule('*/14 * * * *', async () => {
  try {
    const res = await axios.get(URL);
    console.log(`[CRON] Ping success: ${res.status} - ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[CRON] Ping failed: ${error.message} - ${new Date().toISOString()}`);
  }
});
