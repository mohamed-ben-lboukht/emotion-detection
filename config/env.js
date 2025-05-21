/**
 * Environment configuration for the Emotion Detection application
 */
require('dotenv').config();

// Default values for required environment variables
const defaults = {
  PORT: 3001,
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/emotion-detection',
  ADMIN_PASSWORD: 'admin123'
};

// Get environment variable with fallback to default
const getEnv = (key) => {
  return process.env[key] || defaults[key];
};

// Validate required environment variables
const validateEnv = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key] && !defaults[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

// Environment configuration
const env = {
  NODE_ENV: getEnv('NODE_ENV'),
  PORT: parseInt(getEnv('PORT'), 10),
  MONGODB_URI: getEnv('MONGODB_URI'),
  ADMIN_PASSWORD: getEnv('ADMIN_PASSWORD'),
  IS_PRODUCTION: getEnv('NODE_ENV') === 'production',
  IS_DEVELOPMENT: getEnv('NODE_ENV') === 'development'
};

module.exports = {
  env,
  validateEnv
}; 