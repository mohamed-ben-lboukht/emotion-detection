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

// Convert JSON data to CSV format
function jsonToCSVRows(data, type) {
  let rows = [];
  
  if (type === 'manual') {
    // Add keystroke data rows
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${data.emotions.happy},${data.emotions.sad},${data.emotions.anger},${data.emotions.fear},${data.emotions.surprise},"${data.text.replace(/"/g, '""')}",`;
      row += `${entry.type},`;
      row += `${entry.key1 || ''},${entry.key2 || ''},${entry.timeMs}\n`;
      rows.push(row);
    });
  } 
  else if (type === 'music') {
    // Add keystroke data rows
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${data.emotions.happy},${data.emotions.sad},${data.emotions.anger},${data.emotions.fear},"${data.text.replace(/"/g, '""')}",`;
      row += `${entry.type},`;
      row += `${entry.key1 || ''},${entry.key2 || ''},${entry.timeMs}\n`;
      rows.push(row);
    });
  }
  else if (type === 'webcam') {
    // Add keystroke data rows
    data.keystrokeData.forEach(entry => {
      let row = `${data.timestamp},${data.emotionData.currentEmotion},"${data.text.replace(/"/g, '""')}",`;
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

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle POST request for saving data
  if (req.method === 'POST' && req.url === '/save-data') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { type, data } = JSON.parse(body);
        const filename = appendToCSV(data, type);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Data saved successfully',
          filename: path.basename(filename)
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
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
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