/**
 * Error handling middleware for the Emotion Detection application
 */

// Development error handler - with full error details
const developmentErrors = (err, req, res, next) => {
  const status = err.status || 500;
  const errorDetails = {
    message: err.message,
    status: status,
    stackHighlighted: err.stack || ''
  };
  
  console.error('ERROR 💥:', err);
  
  res.status(status).json({
    success: false,
    error: errorDetails
  });
};

// Production error handler - no stack traces leaked to user
const productionErrors = (err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      status: status
    }
  });
};

// Not found error handler
const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.status = 404;
  next(err);
};

module.exports = {
  developmentErrors,
  productionErrors,
  notFound
}; 