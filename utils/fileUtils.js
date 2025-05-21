const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = './data';

const ensureDataDirectories = () => {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  // Create sessions directory if it doesn't exist
  if (!fs.existsSync(path.join(DATA_DIR, 'sessions'))) {
    fs.mkdirSync(path.join(DATA_DIR, 'sessions'), { recursive: true });
  }
};

const saveSessionToJSONFile = (type, data) => {
  // Ensure the directory exists
  const sessionDir = path.join(DATA_DIR, 'sessions');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  // Create a secure filename
  const safeType = (type || 'unknown').replace(/[^a-z0-9_-]/gi, '');
  const safeSessionId = (data.sessionId || 'unknown').replace(/[^a-z0-9_-]/gi, '');
  const timestamp = Date.now();
  const filename = `${safeSessionId}_${safeType}_${timestamp}.json`;
  const filepath = path.join(sessionDir, filename);
  
  // Save the data
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  
  return filepath;
};

module.exports = {
  DATA_DIR,
  ensureDataDirectories,
  saveSessionToJSONFile
}; 