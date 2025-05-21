const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const Session = require('../models/Session');
const { DATA_DIR } = require('../utils/fileUtils');
const { handleAdminLogin, requireAdminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Admin login route
router.post('/login', handleAdminLogin);

// Admin token validation
router.get('/validate-token', (req, res) => {
  const token = req.headers.cookie && req.headers.cookie.split(';').find(c => c.trim().startsWith('session_token='));
  if (token) {
    // Consider any presence of the cookie as valid (for demo)
    return res.json({ valid: true });
  }
  return res.json({ valid: false });
});

// Apply authentication middleware to all admin routes below
router.use(requireAdminAuth);

// List admin sessions route
router.get('/sessions', (req, res) => {
  const sessionsDir = path.join(DATA_DIR, 'sessions');
  fs.readdir(sessionsDir, (err, files) => {
    if (err) {
      logger.error('Unable to read sessions directory:', err);
      return res.status(500).json({ error: 'Unable to read sessions.' });
    }
    
    logger.info("===== LIST OF SESSIONS =====");
    
    // Filter JSON files
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const sessions = [];
    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(sessionsDir, file);
        logger.debug(`Reading file: ${file}`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Debug: display duration-related properties
        logger.debug(`File ${file} - properties:`, {
          hasSessionDuration: 'sessionDuration' in data,
          sessionDuration: data.sessionDuration,
          hasDuration: 'duration' in data,
          duration: data.duration,
          hasTimings: 'timings' in data && Array.isArray(data.timings),
          timingsLength: data.timings && Array.isArray(data.timings) ? data.timings.length : 0
        });
        
        // Calculate session duration in milliseconds
        let durationMs = null;
        
        // 1. Use sessionDuration if available
        if ('sessionDuration' in data && data.sessionDuration !== null) {
          durationMs = Number(data.sessionDuration);
          logger.debug(`${file}: Duration found via sessionDuration: ${durationMs}ms`);
        }
        // 2. Use duration if available
        else if ('duration' in data && data.duration !== null) {
          durationMs = Number(data.duration);
          logger.debug(`${file}: Duration found via duration: ${durationMs}ms`);
        }
        // 3. Calculate from timings if available
        else if (data.timings && Array.isArray(data.timings) && data.timings.length > 1) {
          durationMs = data.timings[data.timings.length - 1] - data.timings[0];
          logger.debug(`${file}: Duration calculated from timings: ${durationMs}ms`);
        }
        
        // Use default duration if none is available
        if (durationMs === null || isNaN(durationMs)) {
          durationMs = 0;
          logger.debug(`${file}: No valid duration found, using 0 as default`);
        }
        
        // Create session object with calculated duration
        sessions.push({
          id: data.sessionId || file.split('_')[0],
          participantUsername: data.userId || 'Anonymous',
          date: data.timestamp || null,
          type: data.context || data.type || 'N/A',
          duration: durationMs,
          sessionDuration: durationMs,
          file: file
        });
        
        logger.debug(`Session added: ${file} with duration: ${durationMs}ms`);
      } catch (e) {
        logger.error(`Error processing file ${file}:`, e);
        // ignore corrupted files
      }
    });
    
    // Sort by descending date
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    logger.info(`Total number of sessions found: ${sessions.length}`);
    logger.debug("First sessions:", sessions.slice(0, 2));
    
    res.json(sessions);
  });
});

// Admin stats route for dashboard
router.get('/stats', (req, res) => {
  const sessionsDir = path.join(DATA_DIR, 'sessions');
  fs.readdir(sessionsDir, (err, files) => {
    if (err) {
      logger.error('Error reading sessions directory:', err);
      return res.json({ totalSessions: 0, todaySessions: 0, totalParticipants: 0, averageDuration: 0 });
    }
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    let totalSessions = 0;
    let todaySessions = 0;
    let totalParticipants = new Set();
    let totalDuration = 0;
    let countDuration = 0;
    const today = new Date().toISOString().slice(0, 10);
    jsonFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
        const data = JSON.parse(content);
        totalSessions++;
        if (data.userId) totalParticipants.add(data.userId);
        if (data.timestamp && data.timestamp.startsWith(today)) todaySessions++;
        if (data.duration) {
          totalDuration += Number(data.duration);
          countDuration++;
        }
      } catch (e) {
        logger.error('Error processing file for stats:', e);
      }
    });
    
    const stats = {
      totalSessions,
      todaySessions,
      totalParticipants: totalParticipants.size,
      averageDuration: countDuration ? Math.round(totalDuration / countDuration) : 0
    };
    
    logger.info('Stats generated:', stats);
    res.json(stats);
  });
});

// Export route: zip of the entire data folder (sessions + CSV)
router.get('/export', (req, res) => {
  const dataDir = path.join(DATA_DIR);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  logger.info('Starting data export');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="export-data.zip"');
  
  archive.directory(dataDir, false);
  archive.finalize();
  archive.pipe(res);
  
  logger.info('Data export completed');
});

// Route to download a specific session file
router.get('/download/:sessionId', (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(DATA_DIR, 'sessions');
    const files = fs.readdirSync(sessionDir);
    
    logger.info(`Attempting to download session file: ${sessionId}`);
    
    // Find the file that matches the session ID
    let sessionFile = null;
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        sessionFile = file;
        break;
      }
    }
    
    if (!sessionFile) {
      logger.warn(`No file found for session: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: 'Session file not found'
      });
    }
    
    const filePath = path.join(sessionDir, sessionFile);
    logger.info(`File found: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`File does not exist: ${filePath}`);
      return res.status(404).json({
        success: false,
        message: 'Session file not found'
      });
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Set headers to force download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${sessionFile}"`);
    
    // Send file content
    logger.info(`Sending file: ${sessionFile}`);
    return res.send(fileContent);
  } catch (error) {
    logger.error('Error downloading file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading file: ' + error.message
    });
  }
});

// Route to get info about a specific session
router.get('/session/:sessionId', (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(DATA_DIR, 'sessions');
    const files = fs.readdirSync(sessionDir);
    
    logger.info(`Retrieving session info: ${sessionId}`);
    
    // Find the file that matches the session ID
    let sessionFile = null;
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        sessionFile = file;
        break;
      }
    }
    
    if (!sessionFile) {
      logger.warn(`Session not found: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const filePath = path.join(sessionDir, sessionFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`Session file not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        message: 'Session file not found'
      });
    }
    
    // Read file content
    const rawData = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Parse JSON content
      const data = JSON.parse(rawData);
      
      // Return session information
      logger.info(`Session info retrieved: ${sessionId}`);
      return res.json({
        success: true,
        data: data,
        sessionId: sessionId,
        filename: sessionFile,
        downloadUrl: `/api/admin/download/${sessionId}`
      });
    } catch (parseError) {
      logger.error(`Error parsing JSON file: ${parseError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error parsing JSON file: ' + parseError.message
      });
    }
  } catch (error) {
    logger.error('Error retrieving session:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving session: ' + error.message
    });
  }
});

// Route to extract MongoDB data to JSON files
router.get('/extract-data', async (req, res) => {
  try {
    // Simple authentication (improve in production)
    const password = req.query.password;
    if (password !== 'admin123') {
      logger.warn('Unauthorized extract-data attempt');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    logger.info('Starting MongoDB data extraction');

    // Get sessions from MongoDB
    const sessions = await Session.find().sort({ startTime: -1 });
    
    if (sessions.length === 0) {
      logger.info('No MongoDB data to extract');
      return res.json({ success: false, message: 'No data to extract from MongoDB' });
    }
    
    // Create sessions directory if it doesn't exist
    const sessionsDir = path.join(DATA_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    // Extract each session as a JSON file
    const savedFiles = [];
    for (const session of sessions) {
      // Create a filename based on sessionId and date
      const timestamp = new Date(session.startTime || Date.now()).getTime();
      const context = session.context || 'unknown';
      const sessionId = session.sessionId || crypto.randomBytes(16).toString('hex');
      const filename = `${sessionId}_${context}_${timestamp}.json`;
      const filepath = path.join(sessionsDir, filename);
      
      // Convert MongoDB document to JSON object without MongoDB internal fields
      const sessionData = session.toObject();
      delete sessionData._id;
      delete sessionData.__v;
      
      // Save JSON file
      fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2));
      savedFiles.push({
        filename,
        path: filepath,
        sessionId: sessionId
      });
      
      logger.debug(`Extracted session: ${filename}`);
    }
    
    // Return JSON response
    logger.info(`MongoDB data extraction complete: ${savedFiles.length} sessions`);
    return res.json({
      success: true,
      message: 'Extraction successful',
      count: savedFiles.length,
      files: savedFiles
    });
  } catch (error) {
    logger.error('Error extracting MongoDB data:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error: ${error.message}` 
    });
  }
});

module.exports = router; 