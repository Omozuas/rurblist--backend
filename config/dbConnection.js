const mongoose = require('mongoose');

async function connect() {
  try {
    await mongoose.connect(process.env.MONG_URL);
    console.log('rurblist connected to db');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

module.exports = connect;
