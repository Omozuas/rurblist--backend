const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');

const enabled = process.env.ENABLE_SELF_PING === 'true';
const serverUrl = process.env.SERVER_URL;
const interval = process.env.SELF_PING_CRON || '*/14 * * * *';
const timeout = Number(process.env.SELF_PING_TIMEOUT_MS) || 10000;

if (!enabled) {
  logger.info('Self ping disabled');
} else if (!serverUrl) {
  logger.warn('ENABLE_SELF_PING=true but SERVER_URL is not set');
} else if (!cron.validate(interval)) {
  logger.warn('Invalid SELF_PING_CRON. Self ping disabled', { interval });
} else {
  const url = `${serverUrl.replace(/\/$/, '')}/home`;

  cron.schedule(interval, async () => {
    try {
      const response = await axios.get(url, { timeout });
      logger.info('Self ping success', { status: response.status, url });
    } catch (error) {
      logger.error('Self ping failed', { error, url });
    }
  });
}
