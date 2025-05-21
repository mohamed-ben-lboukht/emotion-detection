const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');

const connectToDatabase = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    
    await mongoose.connect(env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true
    });
    
    logger.info('Connected to MongoDB');
    return true;
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    logger.error('MongoDB connection is required. Please check your connection string.');
    return false;
  }
};

module.exports = {
  connectToDatabase
}; 