const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const getCurrentLevel = () => {
  const fallback = (process.env.NODE_ENV || '').trim() === 'production' ? 'info' : 'debug';
  const level = (process.env.LOG_LEVEL || fallback).trim();

  return Object.prototype.hasOwnProperty.call(levels, level) ? level : fallback;
};

const shouldLog = (level) => levels[level] <= levels[getCurrentLevel()];

const serializeError = (error) => ({
  name: error.name,
  message: error.message,
  stack: (process.env.NODE_ENV || '').trim() === 'production' ? undefined : error.stack,
});

const cleanMeta = (meta = {}) => {
  const output = {};

  Object.entries(meta).forEach(([key, value]) => {
    output[key] = value instanceof Error ? serializeError(value) : value;
  });

  return output;
};

const write = (level, message, meta) => {
  if (!shouldLog(level)) return;

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta && Object.keys(meta).length) {
    payload.meta = cleanMeta(meta);
  }

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

module.exports = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};
