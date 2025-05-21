/**
 * Authentication middleware for admin routes
 */
const { env } = require('../config/env');
const logger = require('../utils/logger');

// Simple authentication middleware for admin routes
const requireAdminAuth = (req, res, next) => {
  const token = req.headers.cookie && req.headers.cookie.split(';').find(c => c.trim().startsWith('session_token='));
  
  if (!token) {
    logger.warn('Authentication failed: No session token');
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        status: 401
      }
    });
  }
  
  // For a more secure implementation, we would verify the token against a database
  // or use a proper JWT verification mechanism
  // But for this demo, we just check if a cookie is present
  
  next();
};

// Extract admin user from session
const getAdminUser = (req) => {
  return { username: 'admin' };
};

// Login handler with configurable admin password
const handleAdminLogin = (req, res) => {
  const { username, password } = req.body;
  const adminPassword = env.ADMIN_PASSWORD;
  
  // Check credentials
  if (username === 'admin' && password === adminPassword) {
    // In a real application, we would generate a proper JWT token here
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    
    // Set the session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      sameSite: 'lax',
      secure: env.IS_PRODUCTION // Only use secure cookies in production
    });
    
    logger.info('Admin login successful');
    return res.json({ 
      success: true, 
      user: { username: 'admin' } 
    });
  }
  
  logger.warn(`Failed admin login attempt for username: ${username}`);
  return res.status(401).json({ 
    success: false, 
    message: 'Invalid credentials' 
  });
};

module.exports = {
  requireAdminAuth,
  getAdminUser,
  handleAdminLogin
}; 