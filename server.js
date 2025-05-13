require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const Session = require('./models/Session');

const app = express();
const PORT = process.env.PORT || 3000;

// Create data directory if it doesn't exist
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Create sessions directory if it doesn't exist
if (!fs.existsSync(path.join(DATA_DIR, 'sessions'))) {
  fs.mkdirSync(path.join(DATA_DIR, 'sessions'), { recursive: true });
}

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-detection', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for model files
    if (filePath.endsWith('-shard1')) {
      res.set('Content-Type', 'application/octet-stream');
    }
  }
}));

// Servir les fichiers du dossier admin
app.use('/admin', express.static('admin'));

// Add security middleware
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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

// Routes pour les sessions MongoDB
app.post('/api/sessions', async (req, res) => {
  try {
    const session = new Session(req.body);
    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ startTime: -1 });
    console.log('===== LISTE DES SESSIONS =====');
    console.log('Nombre total de sessions trouvées:', sessions.length);
    console.log('Premières sessions:', sessions.slice(0, 3));
    res.json(sessions);
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nouvelle route pour visualiser les données JSON collectées
app.get('/view-data', async (req, res) => {
  try {
    // Récupérer à la fois les données MongoDB et les fichiers JSON
    const mongoSessions = await Session.find().sort({ startTime: -1 });
    
    // Lire les fichiers JSON du dossier sessions
    const sessionFiles = fs.existsSync(path.join(DATA_DIR, 'sessions')) 
      ? fs.readdirSync(path.join(DATA_DIR, 'sessions'))
        .filter(file => file.endsWith('.json'))
      : [];
    
    const jsonSessions = [];
    
    // Lire le contenu de chaque fichier JSON
    for (const file of sessionFiles.slice(0, 10)) { // Limite aux 10 premiers fichiers
      try {
        const content = fs.readFileSync(path.join(DATA_DIR, 'sessions', file), 'utf8');
        const data = JSON.parse(content);
        jsonSessions.push(data);
      } catch (err) {
        console.error(`Erreur lors de la lecture du fichier ${file}:`, err);
      }
    }
    
    // Créer une page HTML pour afficher les données
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Données collectées</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #4361ee; }
          .container { margin-bottom: 30px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Données collectées</h1>
        
        <div class="container">
          <h2>Sessions MongoDB (${mongoSessions.length})</h2>
          <pre>${JSON.stringify(mongoSessions, null, 2)}</pre>
        </div>
        
        <div class="container">
          <h2>Sessions JSON (${jsonSessions.length})</h2>
          <pre>${JSON.stringify(jsonSessions, null, 2)}</pre>
        </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).send(`Erreur lors de la récupération des données: ${error.message}`);
  }
});

// Modifier le chemin d'accès pour éviter les conflits
app.get('/api/json-files', (req, res) => {
  try {
    // Vérifier que le dossier sessions existe
    const sessionsDir = path.join(DATA_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      return res.status(404).send('Dossier sessions introuvable');
    }
    
    // Lire les fichiers du dossier
    const files = fs.readdirSync(sessionsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Trier par date de modification (plus récent en premier)
        return fs.statSync(path.join(sessionsDir, b)).mtime.getTime() - 
               fs.statSync(path.join(sessionsDir, a)).mtime.getTime();
      });
    
    if (files.length === 0) {
      return res.send('Aucun fichier JSON trouvé');
    }
    
    // Si on demande un fichier spécifique
    if (req.query.file) {
      const requestedFile = req.query.file;
      const filePath = path.join(sessionsDir, requestedFile);
      
      // Vérifier que le fichier existe et est dans le dossier sessions
      if (!fs.existsSync(filePath) || !requestedFile.endsWith('.json') || 
          path.dirname(path.resolve(filePath)) !== path.resolve(sessionsDir)) {
        return res.status(404).send('Fichier introuvable');
      }
      
      // Lire et renvoyer le contenu du fichier
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (req.query.download === 'true') {
        // Télécharger le fichier
        res.setHeader('Content-Disposition', `attachment; filename="${requestedFile}"`);
        res.setHeader('Content-Type', 'application/json');
        return res.send(content);
      } else {
        // Afficher le contenu formatté
        res.setHeader('Content-Type', 'application/json');
        return res.send(content);
      }
    }
    
    // Générer une liste HTML des fichiers
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fichiers JSON</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4361ee; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          a { color: #4361ee; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .download { margin-left: 15px; padding: 3px 8px; background: #4CAF50; color: white; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Fichiers JSON disponibles (${files.length})</h1>
        <ul>
    `;
    
    files.forEach(file => {
      const stats = fs.statSync(path.join(sessionsDir, file));
      const date = new Date(stats.mtime).toLocaleString();
      const size = (stats.size / 1024).toFixed(2) + ' KB';
      
      html += `
        <li>
          <strong>${file}</strong> (${size}, modifié le ${date})
          <a href="/api/json-files?file=${encodeURIComponent(file)}">Voir</a>
          <a href="/api/json-files?file=${encodeURIComponent(file)}&download=true" class="download">Télécharger</a>
        </li>
      `;
    });
    
    html += `
        </ul>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Erreur lors de l\'accès aux fichiers JSON:', error);
    res.status(500).send(`Erreur: ${error.message}`);
  }
});

// Route de sauvegarde de données (compatibilité avec l'ancien système)
app.post('/save-data', async (req, res) => {
  try {
    const payload = req.body;
    let type, data;
    
    if (payload.type && payload.userId && payload.sessionId) {
      type = payload.type;
      data = payload;
    } else if (payload.type && payload.data) {
      type = payload.type;
      data = payload.data;
    } else if (payload.context) {
      type = payload.context;
      data = payload;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data format: missing type or data'
      });
    }

    // Sauvegarder dans MongoDB avec toutes les données
    const session = new Session({
      sessionId: data.sessionId || crypto.randomBytes(16).toString('hex'),
      startTime: new Date(),
      endTime: new Date(),
      keystrokes: data.timings || [],
      typingSpeed: data.typingSpeed || 0,
      totalKeystrokes: data.keystrokeCount || 0,
      emotionData: data.emotions || {},
      emotionTimeline: data.emotionTimeline || [],
      text: data.text || '',
      context: data.context || type,
      deviceInfo: data.deviceInfo || {}
    });

    await session.save();

    // Sauvegarder aussi dans un fichier JSON pour la compatibilité
    const filepath = path.join(DATA_DIR, 'sessions', `${session.sessionId}_${type}_${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    return res.json({ 
      success: true, 
      message: 'Data saved successfully',
      filename: path.basename(filepath),
      sessionId: session.sessionId
    });
  } catch (error) {
    console.error('Error processing save request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Route pour la page admin permettant d'extraire les données de MongoDB et les sauvegarder en JSON
app.get('/admin/extract-data', async (req, res) => {
  try {
    // Authentification simple (à améliorer en production)
    const password = req.query.password;
    if (password !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Non autorisé.' });
    }

    // Récupérer les sessions de MongoDB
    const sessions = await Session.find().sort({ startTime: -1 });
    
    if (sessions.length === 0) {
      return res.json({ success: false, message: 'Aucune donnée à extraire de MongoDB.' });
    }
    
    // Créer le dossier sessions s'il n'existe pas
    const sessionsDir = path.join(DATA_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    // Extraire chaque session en tant que fichier JSON
    const savedFiles = [];
    for (const session of sessions) {
      // Créer un nom de fichier basé sur sessionId et la date
      const timestamp = new Date(session.startTime || Date.now()).getTime();
      const context = session.context || 'unknown';
      const sessionId = session.sessionId || crypto.randomBytes(16).toString('hex');
      const filename = `${sessionId}_${context}_${timestamp}.json`;
      const filepath = path.join(sessionsDir, filename);
      
      // Convertir le document MongoDB en objet JSON sans les champs MongoDB internes
      const sessionData = session.toObject();
      delete sessionData._id;
      delete sessionData.__v;
      
      // Sauvegarder le fichier JSON
      fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2));
      savedFiles.push({
        filename,
        path: filepath,
        sessionId: sessionId
      });
    }
    
    // Renvoyer une réponse JSON
    return res.json({
      success: true,
      message: 'Extraction réussie',
      count: savedFiles.length,
      files: savedFiles
    });
  } catch (error) {
    console.error('Erreur lors de l\'extraction des données MongoDB:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erreur: ${error.message}` 
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 