/**
 * Simple HTTP server for testing the emotion tracker app
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.csv': 'text/csv'
};

// Create data directory if it doesn't exist
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Fixed CSV files for each tracking type
const CSV_FILES = {
  manual: `${DATA_DIR}/manual_data.csv`,
  music: `${DATA_DIR}/music_data.csv`,
  webcam: `${DATA_DIR}/webcam_data.csv`
};

// Create CSV files with headers if they don't exist
function initializeCSVFiles() {
  // Manual tracking CSV header
  if (!fs.existsSync(CSV_FILES.manual)) {
    const manualHeader = 'timestamp,happy,sad,anger,fear,surprise,text,keystroke_type,key1,key2,time_ms\n';
    fs.writeFileSync(CSV_FILES.manual, manualHeader);
    console.log(`Created file: ${CSV_FILES.manual}`);
  }
  
  // Music tracking CSV header
  if (!fs.existsSync(CSV_FILES.music)) {
    const musicHeader = 'timestamp,happy,sad,anger,fear,text,keystroke_type,key1,key2,time_ms\n';
    fs.writeFileSync(CSV_FILES.music, musicHeader);
    console.log(`Created file: ${CSV_FILES.music}`);
  }
  
  // Webcam tracking CSV header
  if (!fs.existsSync(CSV_FILES.webcam)) {
    const webcamHeader = 'timestamp,detected_emotion,text,keystroke_type,key1,key2,time_ms\n';
    fs.writeFileSync(CSV_FILES.webcam, webcamHeader);
    console.log(`Created file: ${CSV_FILES.webcam}`);
  }
}

// Initialize CSV files at startup
initializeCSVFiles();

// Mapping des nouveaux types vers les anciens pour compatibilité
function mapType(type) {
  if (type === 'free_typing') return 'manual';
  if (type === 'music_typing') return 'music';
  if (type === 'webcam_typing') return 'webcam';
  return type;
}

// --- Sécurité et validation avancée pour la collecte de données ---
const MAX_BODY_SIZE = 512 * 1024; // 512 Ko max par requête

function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001F\u007F-\u009F<>"'\\]/g, '');
}

function validateAndSanitizeData(type, data) {
  // Champs obligatoires
  if (!data || typeof data !== 'object') throw new Error('Invalid data');
  if (!isValidUUID(data.userId)) throw new Error('Invalid userId');
  if (!isValidUUID(data.sessionId)) throw new Error('Invalid sessionId');
  if (!data.deviceInfo || typeof data.deviceInfo !== 'object') throw new Error('Missing deviceInfo');
  // Accepte timings OU keystrokeData
  if (!Array.isArray(data.keystrokeData) && !Array.isArray(data.timings)) throw new Error('Missing keystrokeData or timings');
  if (typeof data.cameraActive !== 'boolean') throw new Error('Missing cameraActive');
  if (typeof data.musicId !== 'string') throw new Error('Missing musicId');

  // Vérifier et convertir les émotions
  if (data.emotions) {
    // Si c'est un tableau d'émotions détectées (webcam)
    if (Array.isArray(data.emotions)) {
      console.log("Emotions data is an array with length:", data.emotions.length);
      
      // Ensure each emotion has the required fields
      data.emotions = data.emotions.map(entry => {
        const sanitizedEntry = { ...entry };
        if (typeof entry.timestamp !== 'number') sanitizedEntry.timestamp = 0;
        if (typeof entry.emotion !== 'string') sanitizedEntry.emotion = 'neutral';
        if (typeof entry.score !== 'number') sanitizedEntry.score = 0;
        return sanitizedEntry;
      });
      
      data.emotionTimeline = data.emotions;
    } else if (typeof data.emotions === 'object') {
      // Si c'est un objet d'émotions (manual)
      console.log("Emotions data is an object:", data.emotions);
      Object.keys(data.emotions).forEach(key => {
        if (typeof data.emotions[key] !== 'number') {
          data.emotions[key] = parseFloat(data.emotions[key]) || 0;
        }
      });
    }
  } else {
    // Par défaut, créer un objet d'émotions vide
    data.emotions = {};
    data.emotionTimeline = [];
  }

  // Sanitize text
  data.text = sanitizeText(data.text || '');
  // Sanitize keystrokeData si présent
  if (Array.isArray(data.keystrokeData)) {
    data.keystrokeData = data.keystrokeData.map(entry => {
      return {
        ...entry,
        key: sanitizeText(entry.key || ''),
      };
    });
  }
  return data;
}

// Convert JSON data to CSV format
function jsonToCSVRows(data, type) {
  let rows = [];
  // Valeurs par défaut pour émotions
  const emotions = {
    happy: (data.emotions && data.emotions.happy) || '',
    sad: (data.emotions && data.emotions.sad) || '',
    anger: (data.emotions && data.emotions.anger) || '',
    fear: (data.emotions && data.emotions.fear) || '',
    surprise: (data.emotions && data.emotions.surprise) || ''
  };
  if (type === 'manual') {
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${emotions.happy},${emotions.sad},${emotions.anger},${emotions.fear},${emotions.surprise},"${data.text ? data.text.replace(/"/g, '""') : ''}",`;
      row += `${entry.type},`;
      row += `${entry.key1 || ''},${entry.key2 || ''},${entry.timeMs}\n`;
      rows.push(row);
    });
  } 
  else if (type === 'music') {
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${emotions.happy},${emotions.sad},${emotions.anger},${emotions.fear},"${data.text ? data.text.replace(/"/g, '""') : ''}",`;
      row += `${entry.type},`;
      row += `${entry.key1 || ''},${entry.key2 || ''},${entry.timeMs}\n`;
      rows.push(row);
    });
  }
  else if (type === 'webcam') {
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${(data.emotionData && data.emotionData.currentEmotion) || ''},"${data.text ? data.text.replace(/"/g, '""') : ''}",`;
      row += `${entry.type},`;
      row += `${entry.key1 || ''},${entry.key2 || ''},${entry.timeMs}\n`;
      rows.push(row);
    });
  }
  return rows.join('');
}

// Append data to the appropriate CSV file
function appendToCSV(data, type) {
  try {
    const csvRows = jsonToCSVRows(data, type);
    fs.appendFileSync(CSV_FILES[type], csvRows);
    console.log(`Data appended to ${CSV_FILES[type]}`);
    return CSV_FILES[type];
  } catch (error) {
    console.error(`Error appending to CSV file: ${error.message}`);
    throw error;
  }
}

// --- Stockage par fichier JSON individuel (1 fichier par session) ---
function saveSessionToJSONFile(type, data) {
  const sessionDir = path.join(DATA_DIR, 'sessions');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir);
  }
  const filename = `${data.sessionId}_${type}_${Date.now()}.json`;
  const filepath = path.join(sessionDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle POST request for saving data
  if (req.method === 'POST' && req.url === '/save-data') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Request body too large' 
        }));
        req.destroy();
      }
    });
    
    req.on('end', () => {
      try {
        let { type, data } = JSON.parse(body);
        type = mapType(type); // Correction ici
        console.log("Received data type:", type);
        console.log("Emotions data:", data.emotions ? (Array.isArray(data.emotions) ? `Array with ${data.emotions.length} items` : "Object") : "None");
        
        const sanitizedData = validateAndSanitizeData(type, data);
        
        // Log what's being saved
        console.log("Saving data with emotions:", sanitizedData.emotions ? 
          (Array.isArray(sanitizedData.emotions) ? `Array with ${sanitizedData.emotions.length} items` : "Object") : "None");
        
        const filepath = saveSessionToJSONFile(type, sanitizedData); // Sauvegarde fichier JSON
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Data saved successfully in JSON file',
          filename: filepath
        }));
      } catch (error) {
        console.error('Error processing save request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Error saving data: ' + error.message 
        }));
      }
    });
    
    return;
  }
  
  // Handle GET requests for listing saved files
  if (req.method === 'GET' && req.url === '/list-files') {
    try {
      // List our three main CSV files with info
      const files = Object.entries(CSV_FILES).map(([type, filepath]) => {
        try {
          const stats = fs.statSync(filepath);
          return {
            name: path.basename(filepath),
            path: filepath,
            type: type,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            exists: true
          };
        } catch (err) {
          return {
            name: path.basename(filepath),
            path: filepath,
            type: type,
            exists: false
          };
        }
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files }));
    } catch (error) {
      console.error('Error listing files:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error listing files' }));
    }
    
    return;
  }

  // Handle static file requests
  const parsedUrl = url.parse(req.url);
  let filePath = parsedUrl.pathname === '/' ? './index.html' : '.' + parsedUrl.pathname;
  
  // Get the file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Check if the request is for a CSV file in the data directory
  if (filePath.startsWith('./data/') && filePath.endsWith('.csv')) {
    // Ensure the file exists
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Read the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code === 'ENOENT') {
        // File not found
        fs.readFile('./404.html', (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success - Add Content-Security-Policy to allow loading from CDN
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob: 'unsafe-inline'"
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Data is being stored in the following CSV files:`);
  console.log(`- Manual tracking: ${CSV_FILES.manual}`);
  console.log(`- Music tracking: ${CSV_FILES.music}`);
  console.log(`- Webcam tracking: ${CSV_FILES.webcam}`);
  console.log('Press Ctrl+C to stop the server');
});