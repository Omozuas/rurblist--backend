const mongoose = require('mongoose');

const stateLabels = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

async function readinessCheck() {
  const state = mongoose.connection.readyState;
  const dbReady = state === 1;

  return {
    ready: dbReady,
    checks: {
      database: {
        ready: dbReady,
        state: stateLabels[state] || `unknown:${state}`,
      },
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

module.exports = readinessCheck;
