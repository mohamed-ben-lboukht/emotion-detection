/**
 * Test script for the Emotion Detection application
 * Verifies the modular structure and checks all components
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { env, validateEnv } = require('./config/env');
const logger = require('./utils/logger');

// Validate environment variables
if (!validateEnv()) {
  logger.error('Environment validation failed');
  process.exit(1);
}

// Function to check if a file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
};

// Verify required modules exist
const requiredFiles = [
  { path: 'config/database.js', description: 'MongoDB connection' },
  { path: 'config/env.js', description: 'Environment configuration' },
  { path: 'utils/fileUtils.js', description: 'File operations' },
  { path: 'utils/sanitization.js', description: 'Data sanitization' },
  { path: 'utils/logger.js', description: 'Logging utilities' },
  { path: 'middleware/security.js', description: 'Security headers' },
  { path: 'middleware/error.js', description: 'Error handling' },
  { path: 'middleware/auth.js', description: 'Authentication' },
  { path: 'routes/api.js', description: 'API endpoints' },
  { path: 'routes/admin.js', description: 'Admin endpoints' },
  { path: 'models/Session.js', description: 'MongoDB session schema' },
  { path: 'app.js', description: 'Main application file' }
];

// Print application info
logger.info('======= Emotion Detection Application Test =======');
logger.info(`Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
logger.info(`MongoDB URI: ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Check all required files
logger.info('\nVerifying file structure:');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fileExists(file.path);
  const status = exists ? '✅' : '❌';
  logger.info(`${status} ${file.path}: ${file.description}`);
  if (!exists) {
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  logger.error('\n❌ Some required files are missing. Please fix before continuing.');
  process.exit(1);
}

logger.info('\nRoutes available:');
logger.info(' - API: /api/save-data, /api/sessions/, /api/sessions/:id');
logger.info(' - Admin: /api/admin/login, /api/admin/validate-token, /api/admin/sessions, etc.');
logger.info(' - Static: /, /admin/login, /admin/dashboard, /admin/unauthorized');
logger.info(' - Backward compatibility: /save-data');

// Attempt to load the main application
try {
  const app = require('./app');
  logger.info('\n✅ Application loaded successfully');
} catch (error) {
  logger.error('\n❌ Failed to load application:', error);
  process.exit(1);
}

logger.info('\n======= Test Complete =======');
logger.info('✅ All modules verified. Application is ready to start.');
logger.info('Run "npm start" to launch the application.'); 