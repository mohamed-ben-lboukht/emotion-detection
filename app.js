/**
 * Express server for Keystroke Dynamics & Emotion Detection app
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3001;

// Create data directory if it doesn't exist
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Create sessions directory if it doesn't exist
if (!fs.existsSync(path.join(DATA_DIR, 'sessions'))) {
  fs.mkdirSync(path.join(DATA_DIR, 'sessions'), { recursive: true });
  // DEBUG console.log(`Created directory: ${path.join(DATA_DIR, 'sessions')}`);
}

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
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Mise à jour CSP pour Docker/différents environnements
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *; font-src 'self'; media-src 'self'");
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=self, microphone=self, geolocation=()');
  next();
});

// Add JSON parsing middleware with increased limit for larger payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to generate UUID
function generateUUIDv4() {
  // La méthode getRandomValues peut ne pas être disponible dans certains environnements Node.js
  try {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  } catch (e) {
    // Fallback pour les environnements sans getRandomValues
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Helper function to sanitize text
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001F\u007F-\u009F<>"'\\]/g, '');
}

// Helper function to save session to JSON file
function saveSessionToJSONFile(type, data) {
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
  // DEBUG console.log(`Data saved to: ${filepath}`);
  
  return filepath;
}

// Function to validate and sanitize data
function validateAndSanitizeData(type, data) {
  // DEBUG console.log("Validating and sanitizing data for type:", type);
  
  // Clone to avoid modifying the original
  const sanitizedData = JSON.parse(JSON.stringify(data));
  
  // Ensure required fields
  if (!sanitizedData.userId) {
    // DEBUG console.log("No userId provided, generating a random one");
    sanitizedData.userId = crypto.randomBytes(16).toString('hex');
  }
  
  if (!sanitizedData.sessionId) {
    // DEBUG console.log("No sessionId provided, generating one");
    sanitizedData.sessionId = crypto.randomBytes(16).toString('hex');
  }
  
  // Sanitize text content
  if (sanitizedData.text) {
    sanitizedData.text = sanitizeText(sanitizedData.text);
  } else {
    sanitizedData.text = "";
  }
  
  // Ensure timestamp
  if (!sanitizedData.timestamp) {
    sanitizedData.timestamp = new Date().toISOString();
  }
  
  // Handle different formats of emotions data
  if (sanitizedData.emotions) {
    if (typeof sanitizedData.emotions === 'object' && !Array.isArray(sanitizedData.emotions)) {
      // Convert object format to array format for consistency
      // DEBUG console.log("Converting emotions object to timeline format");
      const emotionValues = Object.entries(sanitizedData.emotions)
        .map(([emotion, value]) => ({ emotion, value }));
      
      // Find the dominant emotion
      const dominantEmotion = emotionValues.reduce(
        (max, current) => current.value > max.value ? current : max, 
        { emotion: 'neutral', value: 0 }
      );
      
      // Create a timeline entry
      sanitizedData.emotionTimeline = [{
        timestamp: 0,
        emotion: dominantEmotion.emotion,
        score: dominantEmotion.value,
        allEmotions: sanitizedData.emotions
      }];
    }
  }
  
  // Ensure emotionTimeline is always present
  if (!sanitizedData.emotionTimeline) {
    sanitizedData.emotionTimeline = [];
  }
  
  // Ensure context
  if (!sanitizedData.context) {
    sanitizedData.context = type;
  }
  
  // DEBUG console.log("Validation complete, returning sanitized data");
  return sanitizedData;
}

// API endpoint for data saving
app.post('/save-data', (req, res) => {
  // DEBUG console.log("==== SAVE DATA REQUEST RECEIVED ====");
  
  try {
    const payload = req.body;
    
    // Support both formats:
    // 1. { type, data } - original format
    // 2. { type, userId, sessionId, ... } - new direct format
    
    let type, data;
    
    // Check if it's the new format (direct data in payload)
    if (payload.type && payload.userId && payload.sessionId) {
      // DEBUG console.log("Detected direct data format");
      type = payload.type;
      data = payload; // Use the payload directly as data
    } 
    // Check if it's the original format with type and data
    else if (payload.type && payload.data) {
      // DEBUG console.log("Detected {type, data} format");
      type = payload.type;
      data = payload.data;
    }
    // Legacy format with just data and context
    else if (payload.context) {
      // DEBUG console.log("Detected legacy format with context");
      type = payload.context;
      data = payload;
    }
    // Unknown format
    else {
      console.error("Unknown data format in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data format: missing type or data'
      });
    }
    
    // Validate inputs
    if (!type) {
      console.error("Missing type in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Missing type parameter' 
      });
    }
    
    if (!data) {
      console.error("Missing data in request");
      return res.status(400).json({ 
        success: false, 
        message: 'Missing data parameter' 
      });
    }
    
    // DEBUG console.log("Data received for type:", type);
    // DEBUG console.log("Data keys:", Object.keys(data));
    
    // Process emotions data
    if (data.emotions) {
      // DEBUG console.log("Emotions data present:", 
      //   Array.isArray(data.emotions) 
      //     ? `Array with ${data.emotions.length} items` 
      //     : "Object with keys: " + Object.keys(data.emotions).join(", ")
      // );
    } else {
      // DEBUG console.log("No emotions data present");
    }
    
    if (data.emotionTimeline) {
      // DEBUG console.log("Emotion timeline present with", 
      //   data.emotionTimeline.length, "entries");
    }
    
    try {
      // Validate and sanitize data
      const sanitizedData = validateAndSanitizeData(type, data);
      // DEBUG console.log("Data validated and sanitized successfully");
      
      // Save to file
      const filepath = saveSessionToJSONFile(type, sanitizedData);
      // DEBUG console.log("Data saved successfully to:", filepath);
      
      return res.json({ 
        success: true, 
        message: 'Data saved successfully',
        filename: path.basename(filepath),
        sessionId: sanitizedData.sessionId || "unknown"
      });
    } catch (processingError) {
      console.error("Error processing data:", processingError);
      return res.status(400).json({ 
        success: false, 
        message: 'Error processing data: ' + processingError.message 
      });
    }
  } catch (error) {
    console.error('Error processing save request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data is being stored in JSON format in: ${path.join(DATA_DIR, 'sessions')}`);
}); 