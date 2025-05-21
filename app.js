/**
 * Express server for Keystroke Dynamics & Emotion Detection app
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectToDatabase } = require('./config/database');
const { ensureDataDirectories } = require('./utils/fileUtils');
const { addSecurityHeaders } = require('./middleware/security');
const { developmentErrors, productionErrors, notFound } = require('./middleware/error');
const { env, validateEnv } = require('./config/env');
const logger = require('./utils/logger');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Validate environment variables
if (!validateEnv()) {
  logger.error('Environment validation failed, exiting');
  process.exit(1);
}

const app = express();
const PORT = env.PORT;

// Log application startup
logger.info(`Starting application in ${env.NODE_ENV} mode`);

// Ensure required directories exist
ensureDataDirectories();

// Connect to MongoDB
let isMongoConnected = false;
connectToDatabase()
  .then(result => {
    isMongoConnected = result;
    if (!isMongoConnected) {
      logger.error('Application cannot continue without MongoDB connection');
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for model files
    if (filePath.endsWith('-shard1')) {
      res.set('Content-Type', 'application/octet-stream');
    }
  }
}));

// Add security middleware
app.use(addSecurityHeaders);

// Add JSON parsing middleware with increased limit for larger payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// For backward compatibility, preserve the /save-data endpoint at the root
app.post('/save-data', apiRoutes);

// Use API routes
app.use('/api', apiRoutes);

// Use Admin routes
app.use('/api/admin', adminRoutes);

// Serve static admin pages
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.get('/admin/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'unauthorized.html'));
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add 404 handler for undefined routes
app.use(notFound);

// Add error handlers - use development errors in dev mode, production errors in prod
if (env.IS_DEVELOPMENT) {
  app.use(developmentErrors);
} else {
  app.use(productionErrors);
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

module.exports = app;