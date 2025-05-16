/**
 * Express server for Keystroke Dynamics & Emotion Detection app
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const mongoose = require('mongoose');
const Session = require('./models/Session');
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
}

// Connect to MongoDB
let isMongoConnected = false;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-detection', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout instead of 30
  retryWrites: true
})
.then(() => {
  console.log('Connected to MongoDB');
  isMongoConnected = true;
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('MongoDB connection is required. Please check your connection string.');
  // Don't allow the application to continue without MongoDB
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
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Correction CSP pour Font Awesome CDN
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src 'self' *; font-src 'self' https://cdnjs.cloudflare.com; media-src 'self'");
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=self, microphone=self, geolocation=()');
  next();
});

// Add JSON parsing middleware with increased limit for larger payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  
  return filepath;
}

// Function to validate and sanitize data
function validateAndSanitizeData(type, data) {
  // Clone to avoid modifying the original
  const sanitizedData = JSON.parse(JSON.stringify(data));
  
  // Ensure required fields
  if (!sanitizedData.userId) {
    sanitizedData.userId = crypto.randomBytes(16).toString('hex');
  }
  
  if (!sanitizedData.sessionId) {
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
  
  return sanitizedData;
}

// API endpoint for data saving
app.post('/save-data', async (req, res) => {
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
      console.log('Data saved to MongoDB:', session.sessionId);
      
      // Also save to local file as backup
      const filepath = saveSessionToJSONFile(type, sanitizedData);
      
      return res.json({ 
        success: true, 
        message: 'Data saved successfully to MongoDB',
        sessionId: sanitizedData.sessionId || session.sessionId,
        mongoDbId: session._id
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

// === ROUTE DE CONNEXION ADMIN ===
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  // Identifiants fixes pour la démo
  if (username === 'admin' && password === 'admin123') {
    // Générer un token de session fictif
    const sessionToken = crypto.randomBytes(32).toString('hex');
    // Placer un cookie httpOnly (valable 8h)
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures
      sameSite: 'lax',
      secure: false // à mettre true en production avec HTTPS
    });
    return res.json({ success: true, user: { username: 'admin' }, token: sessionToken });
  }
  return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
});

// Validation du token admin
app.get('/api/admin/validate-token', (req, res) => {
  const token = req.headers.cookie && req.headers.cookie.split(';').find(c => c.trim().startsWith('session_token='));
  if (token) {
    // On considère toute présence du cookie comme valide (pour la démo)
    return res.json({ valid: true });
  }
  return res.json({ valid: false });
});

// Route pour lister les sessions admin
app.get('/api/admin/sessions', (req, res) => {
  const sessionsDir = path.join(__dirname, 'data', 'sessions');
  fs.readdir(sessionsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Impossible de lire les sessions.' });
    }
    
    console.log("===== LISTE DES SESSIONS =====");
    
    // Filtrer les fichiers JSON
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const sessions = [];
    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(sessionsDir, file);
        console.log(`Lecture du fichier: ${file}`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Debug: afficher les propriétés liées à la durée
        console.log(`Fichier ${file} - propriétés:`, {
          hasSessionDuration: 'sessionDuration' in data,
          sessionDuration: data.sessionDuration,
          hasDuration: 'duration' in data,
          duration: data.duration,
          hasTimings: 'timings' in data && Array.isArray(data.timings),
          timingsLength: data.timings && Array.isArray(data.timings) ? data.timings.length : 0
        });
        
        // Calculer la durée de session en millisecondes
        let durationMs = null;
        
        // 1. Utiliser sessionDuration si disponible
        if ('sessionDuration' in data && data.sessionDuration !== null) {
          durationMs = Number(data.sessionDuration);
          console.log(`${file}: Durée trouvée via sessionDuration: ${durationMs}ms`);
        }
        // 2. Utiliser duration si disponible
        else if ('duration' in data && data.duration !== null) {
          durationMs = Number(data.duration);
          console.log(`${file}: Durée trouvée via duration: ${durationMs}ms`);
        }
        // 3. Calculer à partir des timings si disponibles
        else if (data.timings && Array.isArray(data.timings) && data.timings.length > 1) {
          durationMs = data.timings[data.timings.length - 1] - data.timings[0];
          console.log(`${file}: Durée calculée via timings: ${durationMs}ms`);
        }
        
        // Utiliser une durée par défaut si aucune n'est disponible
        if (durationMs === null || isNaN(durationMs)) {
          durationMs = 0;
          console.log(`${file}: Aucune durée valide trouvée, utilisation de 0 par défaut`);
        }
        
        // Créer l'objet session avec la durée calculée
        sessions.push({
          id: data.sessionId || file.split('_')[0],
          participantUsername: data.userId || 'Anonyme',
          date: data.timestamp || null,
          type: data.context || data.type || 'N/A',
          duration: durationMs,
          sessionDuration: durationMs,
          file: file
        });
        
        console.log(`Session ajoutée: ${file} avec durée: ${durationMs}ms`);
      } catch (e) {
        console.error(`Erreur lors du traitement du fichier ${file}:`, e);
        // ignorer les fichiers corrompus
      }
    });
    
    // Trier par date décroissante
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Nombre total de sessions trouvées: ${sessions.length}`);
    console.log("Premières sessions:", sessions.slice(0, 2));
    
    res.json(sessions);
  });
});

// Route statistiques admin pour dashboard
app.get('/api/admin/stats', (req, res) => {
  const sessionsDir = path.join(__dirname, 'data', 'sessions');
  fs.readdir(sessionsDir, (err, files) => {
    if (err) {
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
      } catch (e) {}
    });
    res.json({
      totalSessions,
      todaySessions,
      totalParticipants: totalParticipants.size,
      averageDuration: countDuration ? Math.round(totalDuration / countDuration) : 0
    });
  });
});

// Route d'exportation : zip de tout le dossier data (sessions + CSV)
app.get('/api/admin/export', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="export-data.zip"');
  archive.directory(dataDir, false);
  archive.finalize();
  archive.pipe(res);
});

// Servir les pages statiques admin
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});
app.get('/admin/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'unauthorized.html'));
});

// Route pour télécharger un fichier de session spécifique
app.get('/api/admin/download/:sessionId', (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(__dirname, 'data', 'sessions');
    const files = fs.readdirSync(sessionDir);
    
    console.log(`Tentative de téléchargement du fichier de session: ${sessionId}`);
    
    // Trouver le fichier qui correspond à l'ID de session
    let sessionFile = null;
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        sessionFile = file;
        break;
      }
    }
    
    if (!sessionFile) {
      console.log(`Aucun fichier trouvé pour la session: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: 'Fichier de session introuvable'
      });
    }
    
    const filePath = path.join(sessionDir, sessionFile);
    console.log(`Fichier trouvé: ${filePath}`);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier de session introuvable'
      });
    }
    
    // Lire le contenu du fichier
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Définir les en-têtes pour forcer le téléchargement
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${sessionFile}"`);
    
    // Envoyer le contenu du fichier
    return res.send(fileContent);
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du fichier: ' + error.message
    });
  }
});

// Route pour récupérer des infos sur une session spécifique
app.get('/api/admin/session/:sessionId', (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(__dirname, 'data', 'sessions');
    const files = fs.readdirSync(sessionDir);
    
    // Trouver le fichier qui correspond à l'ID de session
    let sessionFile = null;
    for (const file of files) {
      if (file.includes(sessionId) && file.endsWith('.json')) {
        sessionFile = file;
        break;
      }
    }
    
    if (!sessionFile) {
      return res.status(404).json({
        success: false,
        message: 'Session introuvable'
      });
    }
    
    const filePath = path.join(sessionDir, sessionFile);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier de session introuvable'
      });
    }
    
    // Lire le contenu du fichier
    const rawData = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Parser le contenu JSON
      const data = JSON.parse(rawData);
      
      // Renvoyer les informations de la session
      return res.json({
        success: true,
        data: data,
        sessionId: sessionId,
        filename: sessionFile,
        downloadUrl: `/api/admin/download/${sessionId}`
      });
    } catch (parseError) {
      console.error(`Erreur lors du parsing du fichier JSON: ${parseError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du parsing du fichier JSON: ' + parseError.message
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la session: ' + error.message
    });
  }
});

// === MongoDB API routes ===
// Route to get all sessions from MongoDB
app.get('/api/sessions', async (req, res) => {
  try {
    // Get data from MongoDB
    const sessions = await Session.find().sort({ startTime: -1 });
    console.log('Retrieved MongoDB sessions:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('Error retrieving MongoDB sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to extract MongoDB data to JSON files
app.get('/admin/extract-data', async (req, res) => {
  try {
    // Simple authentication (improve in production)
    const password = req.query.password;
    if (password !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get sessions from MongoDB
    const sessions = await Session.find().sort({ startTime: -1 });
    
    if (sessions.length === 0) {
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
    }
    
    // Return JSON response
    return res.json({
      success: true,
      message: 'Extraction successful',
      count: savedFiles.length,
      files: savedFiles
    });
  } catch (error) {
    console.error('Error extracting MongoDB data:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error: ${error.message}` 
    });
  }
});

// Route to get a single session from MongoDB by ID
app.get('/api/sessions/:id', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (!isMongoConnected) {
      return res.status(503).json({ 
        error: 'MongoDB is not connected. Please check your connection settings.',
        mongoStatus: 'disconnected'
      });
    }
    
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error retrieving MongoDB session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});