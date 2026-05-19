const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connect() {
  try {
    await mongoose.connect(process.env.MONG_URL, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    });

    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

module.exports = connect;
