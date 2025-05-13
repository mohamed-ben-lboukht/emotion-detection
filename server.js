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

    // Sauvegarder dans MongoDB
    const session = new Session({
      sessionId: data.sessionId || crypto.randomBytes(16).toString('hex'),
      startTime: new Date(),
      endTime: new Date(),
      keystrokes: data.keystrokes || [],
      typingSpeed: data.typingSpeed || 0,
      totalKeystrokes: data.totalKeystrokes || 0
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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 