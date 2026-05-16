const mongoose = require('mongoose');

async function readinessCheck() {
  // Basic mongoose connectivity check.
  // mongoose.connection.readyState:
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;

  // Treat connected as ready.
  return {
    ready: state === 1,
    db: state === 1 ? 'connected' : `readyState:${state}`,
  };
}

module.exports = readinessCheck;
