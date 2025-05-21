const express = require('express');
const crypto = require('crypto');
const Session = require('../models/Session');
const { saveSessionToJSONFile } = require('../utils/fileUtils');
const { validateAndSanitizeData } = require('../utils/sanitization');
const logger = require('../utils/logger');

const router = express.Router();

// API endpoint for data saving
router.post('/save-data', async (req, res) => {
  try {
    const payload = req.body;
    
    // Support both formats:
    // 1. { type, data } - original format
    // 2. { type, userId, sessionId, ... } - new direct format
    
    let type, data;
    
    // Check if it's the new format (direct data in payload)
    if (payload.type && payload.userId && payload.sessionId) {
      type = payload.type;
      data = payload; // Use the payload directly as data
    } 
    // Check if it's the original format with type and data
    else if (payload.type && payload.data) {
      type = payload.type;
      data = payload.data;
    }
    // Legacy format with just data and context
    else if (payload.context) {
      type = payload.context;
      data = payload;
    }
    // Unknown format
    else {
      logger.error("Unknown data format in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data format: missing type or data'
      });
    }
    
    // Validate inputs
    if (!type) {
      logger.error("Missing type in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Missing type parameter' 
      });
    }
    
    if (!data) {
      logger.error("Missing data in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Missing data parameter' 
      });
    }
    
    try {
      // Validate and sanitize data
      const sanitizedData = validateAndSanitizeData(type, data);
      
      // Create MongoDB session document
      const session = new Session({
        sessionId: sanitizedData.sessionId || crypto.randomBytes(16).toString('hex'),
        startTime: new Date(),
        endTime: new Date(),
        keystrokes: sanitizedData.timings || [],
        typingSpeed: sanitizedData.typingSpeed || 0,
        totalKeystrokes: sanitizedData.keystrokeCount || 0,
        emotionData: sanitizedData.emotions || {},
        emotionTimeline: sanitizedData.emotionTimeline || [],
        text: sanitizedData.text || '',
        context: sanitizedData.context || type,
        deviceInfo: sanitizedData.deviceInfo || {}
      });
      
      // Save to MongoDB (required)
      await session.save();
      logger.info('Data saved to MongoDB:', session.sessionId);
      
      // Also save to local file as backup
      const filepath = saveSessionToJSONFile(type, sanitizedData);
      logger.debug(`Saved backup file: ${filepath}`);
      
      return res.json({ 
        success: true, 
        message: 'Data saved successfully to MongoDB',
        sessionId: sanitizedData.sessionId || session.sessionId,
        mongoDbId: session._id
      });
    } catch (processingError) {
      logger.error("Error processing data:", processingError);
      return res.status(400).json({ 
        success: false, 
        message: 'Error processing data: ' + processingError.message
      });
    }
  } catch (error) {
    logger.error('Error processing save request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message
    });
  }
});

// Route to get all sessions from MongoDB
router.get('/sessions', async (req, res) => {
  try {
    // Get data from MongoDB
    const sessions = await Session.find().sort({ startTime: -1 });
    logger.info(`Retrieved ${sessions.length} MongoDB sessions`);
    res.json(sessions);
  } catch (error) {
    logger.error('Error retrieving MongoDB sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to get a single session from MongoDB by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    logger.debug(`Retrieving MongoDB session: ${sessionId}`);
    
    const session = await Session.findById(sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    logger.info(`Retrieved session: ${sessionId}`);
    res.json(session);
  } catch (error) {
    logger.error('Error retrieving MongoDB session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 