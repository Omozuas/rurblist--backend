const mongoose = require('mongoose');

async function connect() {
  try {
    await mongoose.connect(process.env.MONG_URL, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    });

    console.log('rurblist connected to db');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

module.exports = connect;
