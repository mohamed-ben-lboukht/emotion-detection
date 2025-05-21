/**
 * Logger utility for the Emotion Detection application
 * A simple wrapper around console methods with timestamp and level indicators
 */

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message) => {
  const timestamp = getTimestamp();
  return `[${timestamp}] [${level}] ${message}`;
};

const info = (message, ...args) => {
  console.log(formatMessage('INFO', message), ...args);
};

const warn = (message, ...args) => {
  console.warn(formatMessage('WARN', message), ...args);
};

const error = (message, ...args) => {
  console.error(formatMessage('ERROR', message), ...args);
};

const debug = (message, ...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(formatMessage('DEBUG', message), ...args);
  }
};

module.exports = {
  info,
  warn,
  error,
  debug
}; 