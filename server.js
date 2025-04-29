/**
 * Simple HTTP server for testing the emotion tracker app
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// IMPORTANT: In production, use secure dependencies
// const bcrypt = require('bcrypt'); // For password hashing (would need to be installed with npm)

// Simple rate limiting implementation
const rateLimiter = {
  // Store IP addresses and their request counts
  requestCounts: new Map(),
  // Maximum requests per time window
  maxRequests: 100,
  // Time window in milliseconds (5 minutes)
  timeWindow: 5 * 60 * 1000,
  
  // Check if a request should be rate limited
  isRateLimited(ip) {
    const now = Date.now();
    
    // Clean up old entries
    if (now % 60000 === 0) { // Only do cleanup occasionally to avoid performance impact
      this.cleanup(now);
    }
    
    // Get or create entry for this IP
    if (!this.requestCounts.has(ip)) {
      this.requestCounts.set(ip, { count: 0, timestamp: now });
      return false;
    }
    
    const record = this.requestCounts.get(ip);
    
    // Reset if outside time window
    if (now - record.timestamp > this.timeWindow) {
      record.count = 0;
      record.timestamp = now;
      return false;
    }
    
    // Check if over limit
    if (record.count >= this.maxRequests) {
      return true;
    }
    
    // Increment request count
    record.count++;
    return false;
  },
  
  // Clean up old entries
  cleanup(now) {
    for (const [ip, record] of this.requestCounts.entries()) {
      if (now - record.timestamp > this.timeWindow) {
        this.requestCounts.delete(ip);
      }
    }
  }
};

// CSRF token management
const csrfTokens = {
  tokens: new Map(),
  // Generate a token for a session
  generate(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, {
      token,
      created: Date.now()
    });
    return token;
  },
  // Validate a token for a session
  validate(sessionId, token) {
    if (!this.tokens.has(sessionId)) {
      return false;
    }
    
    const storedToken = this.tokens.get(sessionId);
    
    // Token expires after 2 hours
    if (Date.now() - storedToken.created > 2 * 60 * 60 * 1000) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return storedToken.token === token;
  },
  // Clean up expired tokens
  cleanup() {
    const now = Date.now();
    for (const [sessionId, tokenInfo] of this.tokens.entries()) {
      if (now - tokenInfo.created > 2 * 60 * 60 * 1000) {
        this.tokens.delete(sessionId);
      }
    }
  }
};

// Cleanup CSRF tokens every hour
setInterval(() => csrfTokens.cleanup(), 60 * 60 * 1000);

// Configuration de sécurité
const CONFIG = {
  PORT: process.env.PORT || 3000,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme123', // À changer en production !
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  ENABLE_AUTH: true, // Mettre à true pour activer l'authentification
  DATA_ACCESS_TOKEN: process.env.DATA_ACCESS_TOKEN || crypto.randomBytes(32).toString('hex'), // Token de sécurité pour accès aux données
  MAX_LOGIN_ATTEMPTS: 5, // Maximum login attempts before temporary lockout
  LOGIN_LOCKOUT_TIME: 15 * 60 * 1000 // 15 minutes lockout time
};

// Lockout tracking for brute force prevention
const loginAttempts = new Map();

// Stocke les sessions actives (en mémoire - utiliser une DB en production)
const activeSessions = new Map();

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

// Create sessions directory if it doesn't exist
if (!fs.existsSync(path.join(DATA_DIR, 'sessions'))) {
  fs.mkdirSync(path.join(DATA_DIR, 'sessions'), { recursive: true });
  console.log(`Created directory: ${path.join(DATA_DIR, 'sessions')}`);
}

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
        key1: sanitizeText(entry.key1 || ''),
        key2: sanitizeText(entry.key2 || '')
      };
    });
  }
  return data;
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
  console.log(`Data saved to: ${filepath}`);
  return filepath;
}

// Génération de token de session avec expiration
function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex');
}

// Vérification d'authentification basique avec hachage
function verifyBasicAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  // Décoder les credentials
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Check for login attempts limit
  const ipAddress = req.socket.remoteAddress || 'unknown';
  const attemptKey = `${ipAddress}:${username}`;
  
  if (loginAttempts.has(attemptKey)) {
    const attempts = loginAttempts.get(attemptKey);
    
    // Check if account is currently locked out
    if (attempts.lockUntil && attempts.lockUntil > Date.now()) {
      console.log(`Account ${username} is locked out until ${new Date(attempts.lockUntil)}`);
      return false;
    }
    
    // Reset lockout if it has expired
    if (attempts.lockUntil && attempts.lockUntil <= Date.now()) {
      attempts.count = 0;
      attempts.lockUntil = null;
    }
  } else {
    loginAttempts.set(attemptKey, { count: 0, lockUntil: null });
  }
  
  // In production, use bcrypt comparison
  // Example with bcrypt (commented out as it requires the package):
  // if (username === CONFIG.ADMIN_USERNAME && await bcrypt.compare(password, hashedStoredPassword)) {
  if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
    // Reset login attempts on successful login
    if (loginAttempts.has(attemptKey)) {
      loginAttempts.set(attemptKey, { count: 0, lockUntil: null });
    }
    return true;
  } else {
    // Increment failed login attempts
    const attempts = loginAttempts.get(attemptKey);
    attempts.count += 1;
    
    // Lock account if too many failed attempts
    if (attempts.count >= CONFIG.MAX_LOGIN_ATTEMPTS) {
      attempts.lockUntil = Date.now() + CONFIG.LOGIN_LOCKOUT_TIME;
      console.log(`Account ${username} locked out until ${new Date(attempts.lockUntil)} due to too many failed attempts`);
    }
    
    loginAttempts.set(attemptKey, attempts);
    return false;
  }
}

// Vérification de token de session
function verifySessionToken(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies.session_token;
  
  if (!sessionToken || !activeSessions.has(sessionToken)) {
    return false;
  }
  
  // Vérifier si la session n'a pas expiré (24h)
  const sessionInfo = activeSessions.get(sessionToken);
  const now = Date.now();
  if (now - sessionInfo.createdAt > 24 * 60 * 60 * 1000) {
    activeSessions.delete(sessionToken);
    return false;
  }
  
  return true;
}

// Parser les cookies
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

// Headers de sécurité pour toutes les réponses
function addSecurityHeaders(res) {
  // Protection XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Empêcher le MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Contrôle du chargement dans des iframes
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Content Security Policy pour limiter les sources de contenu
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self'");
  // Protection contre le clickjacking
  res.setHeader('X-Download-Options', 'noopen');
  // Encourage browsers to use HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'same-origin');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=self, microphone=self, geolocation=()');
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Suivi pour éviter les réponses multiples
  let responseHandled = false;
  
  // Fonction sécurisée pour envoyer des réponses
  const safeResponse = (statusCode, headers, content) => {
    if (responseHandled) return;
    responseHandled = true;
    res.writeHead(statusCode, headers);
    res.end(content);
  };
  
  // Get client IP address for rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  // Check rate limiting except for static resources
  if (!req.url.match(/\.(css|js|jpg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
    if (rateLimiter.isRateLimited(clientIP)) {
      safeResponse(429, { 'Content-Type': 'text/plain' }, 'Too Many Requests');
      return;
    }
  }
  
  // Ajouter les headers de sécurité à toutes les réponses
  addSecurityHeaders(res);
  
  // Parsons l'URL dès le début
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Route de login pour l'interface d'administration
  if (req.method === 'GET' && pathname === '/admin/login') {
    fs.readFile('./admin/login.html', (error, content) => {
      if (error) {
        safeResponse(500, { 'Content-Type': 'text/html' }, 'Error loading login page');
        return;
      }
      safeResponse(200, { 'Content-Type': 'text/html' }, content);
    });
    return;
  }
  
  // Traitement de la soumission du formulaire de login
  if (req.method === 'POST' && pathname === '/admin/auth') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1024) { // Limite de 1ko pour les données de login
        safeResponse(413, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'Request too large' }));
        req.destroy();
      }
    });
    
    req.on('end', () => {
      try {
        const formData = new URLSearchParams(body);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
          const sessionToken = generateSessionToken();
          activeSessions.set(sessionToken, { 
            username, 
            createdAt: Date.now() 
          });
          
          safeResponse(302, { 
            'Location': '/admin/dashboard',
            'Set-Cookie': `session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict` 
          }, '');
        } else {
          safeResponse(401, { 'Content-Type': 'text/html' }, '<h1>Authentication Failed</h1><p>Invalid username or password</p><a href="/admin/login">Try again</a>');
        }
      } catch (error) {
        safeResponse(400, { 'Content-Type': 'text/html' }, '<h1>Bad Request</h1>');
      }
    });
    
    return;
  }
  
  // Routes protégées d'administration
  if (pathname.startsWith('/admin/') && pathname !== '/admin/login' && pathname !== '/admin/auth') {
    // Vérifier l'authentification
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      safeResponse(302, { 'Location': '/admin/login' }, '');
      return;
    }
    
    // Admin dashboard
    if (pathname === '/admin/dashboard') {
      fs.readFile('./admin/dashboard.html', (error, content) => {
        if (error) {
          safeResponse(500, { 'Content-Type': 'text/html' }, 'Error loading dashboard');
          return;
        }
        safeResponse(200, { 'Content-Type': 'text/html' }, content);
      });
      return;
    }
  }
  
  // Protection des dossiers de données
  if (pathname.startsWith('/data/') || pathname.includes('../')) {
    const cookies = parseCookies(req);
    const isAdmin = CONFIG.ENABLE_AUTH && verifySessionToken(req);
    const hasAccessToken = pathname.includes(`?token=${CONFIG.DATA_ACCESS_TOKEN}`);
    
    if (!isAdmin && !hasAccessToken) {
      safeResponse(403, { 'Content-Type': 'text/plain' }, 'Access Denied');
      return;
    }
  }
  
  // Handle POST request for saving data
  if (req.method === 'POST' && pathname === '/save-data') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > MAX_BODY_SIZE) {
        safeResponse(413, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: false, 
          message: 'Request body too large' 
        }));
        req.destroy();
      }
    });
    
    req.on('end', () => {
      try {
        let { type, data } = JSON.parse(body);
        type = mapType(type);
        console.log("Received data type:", type);
        console.log("Emotions data:", data.emotions ? (Array.isArray(data.emotions) ? `Array with ${data.emotions.length} items` : "Object") : "None");
        
        const sanitizedData = validateAndSanitizeData(type, data);
        
        // Log what's being saved
        console.log("Saving data with emotions:", sanitizedData.emotions ? 
          (Array.isArray(sanitizedData.emotions) ? `Array with ${sanitizedData.emotions.length} items` : "Object") : "None");
        
        const filepath = saveSessionToJSONFile(type, sanitizedData); // Sauvegarde fichier JSON uniquement
        safeResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: true, 
          message: 'Data saved successfully in JSON file',
          filename: filepath
        }));
      } catch (error) {
        console.error('Error processing save request:', error);
        safeResponse(400, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: false, 
          message: 'Error saving data: ' + error.message 
        }));
      }
    });
    
    return;
  }
  
  // Handle GET requests for listing saved files
  if (req.method === 'GET' && pathname === '/list-files') {
    // Require admin authentication
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      // Redirect to unauthorized page instead of just returning an error
      safeResponse(302, { 'Location': '/admin/unauthorized.html' }, '');
      return;
    }
    
    try {
      // Vérifier si l'utilisateur a le droit de lister les fichiers
      
      const sessionDir = path.join(DATA_DIR, 'sessions');
      const sessionFiles = fs.existsSync(sessionDir) ? 
        fs.readdirSync(sessionDir)
          .filter(file => file.endsWith('.json'))
          .map(file => {
            const stats = fs.statSync(path.join(sessionDir, file));
            return {
              name: file,
              path: path.join(sessionDir, file),
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            };
          }) : [];
      
      safeResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({ files: sessionFiles }));
    } catch (error) {
      console.error('Error listing files:', error);
      safeResponse(500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Error listing files' }));
    }
    
    return;
  }

  // Handle static file requests
  let filePath = pathname === '/' ? './index.html' : '.' + pathname;
  
  // Attention particulière pour /admin/dashboard car géré dans un bloc précédent
  if (pathname === '/admin/dashboard') {
    // Cette route est déjà gérée ailleurs, ne pas la traiter comme fichier statique
    return;
  }
  
  // Get the file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Check if the request is for a CSV file in the data directory
  if (filePath.startsWith('./data/') && filePath.endsWith('.csv')) {
    // Pour l'accès aux CSV, vérifier l'authentification ou le token
    const isAdmin = CONFIG.ENABLE_AUTH && verifySessionToken(req);
    const hasAccessToken = parsedUrl.query && parsedUrl.query.includes(`token=${CONFIG.DATA_ACCESS_TOKEN}`);
    
    if (!isAdmin && !hasAccessToken) {
      safeResponse(403, { 'Content-Type': 'text/plain' }, 'Access Denied');
      return;
    }
    
    // Ensure the file exists
    if (fs.existsSync(filePath)) {
      if (responseHandled) return;
      responseHandled = true;
      
      res.writeHead(200, { 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
        'X-Content-Type-Options': 'nosniff'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Check if the request is for a data file in the sessions directory
  if (filePath.startsWith('./data/sessions/') && filePath.endsWith('.json')) {
    // Require authentication for accessing any session file
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      // Redirect to unauthorized page instead of just returning an error
      safeResponse(302, { 'Location': '/admin/unauthorized.html' }, '');
      return;
    }
    
    // Ensure the file exists
    if (fs.existsSync(filePath)) {
      if (responseHandled) return;
      responseHandled = true;
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
        'X-Content-Type-Options': 'nosniff'
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
          safeResponse(404, { 'Content-Type': 'text/html' }, content);
        });
      } else {
        // Server error - ne pas exposer les détails d'erreur en production
        safeResponse(500, {}, 'Server Error');
        console.error(`Server error: ${error.code} - ${filePath}`);
      }
    } else {
      // Success - Add Content-Security-Policy to allow loading from CDN
      safeResponse(200, { 
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff'
      }, content);
    }
  });

  // --- API sécurisée pour l'administration ---

  // Nouveau point d'API pour l'authentification admin
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1024) { // Limite de 1ko pour les données de login
        safeResponse(413, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'Request too large' }));
        req.destroy();
      }
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { username, password } = data;
        
        if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
          // Générer un JWT token (version simplifiée)
          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 heures
          const sessionToken = generateSessionToken();
          
          activeSessions.set(sessionToken, { 
            username, 
            createdAt: Date.now(),
            expiresAt: expiresAt.getTime()
          });
          
          safeResponse(200, { 
            'Content-Type': 'application/json',
            'Set-Cookie': `session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=28800; SameSite=Strict` 
          }, JSON.stringify({
            success: true,
            message: 'Authentification réussie',
            token: sessionToken,
            user: {
              name: 'Administrateur',
              role: 'admin'
            },
            expiresAt: expiresAt.toISOString()
          }));
        } else {
          safeResponse(401, { 'Content-Type': 'application/json' }, JSON.stringify({ 
            success: false, 
            message: 'Identifiants invalides' 
          }));
        }
      } catch (error) {
        safeResponse(400, { 'Content-Type': 'application/json' }, JSON.stringify({ 
          success: false, 
          message: 'Requête invalide' 
        }));
      }
    });
    
    return;
  }

  // Validation du token
  if (req.method === 'GET' && pathname === '/api/admin/validate-token') {
    if (!verifySessionToken(req)) {
      safeResponse(401, { 'Content-Type': 'application/json' }, JSON.stringify({ valid: false }));
      return;
    }
    
    safeResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({ valid: true }));
    return;
  }

  // Récupération des statistiques pour le tableau de bord
  if (req.method === 'GET' && pathname === '/api/admin/stats') {
    // Vérifier l'authentification
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      safeResponse(401, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'Non autorisé' }));
      return;
    }
    
    try {
      // Récupérer les statistiques des sessions
      const sessionFiles = fs.readdirSync(path.join(DATA_DIR, 'sessions'))
        .filter(file => file.endsWith('.json'));
      
      const totalSessions = sessionFiles.length;
      const todaySessions = sessionFiles
        .filter(file => {
          const stats = fs.statSync(path.join(DATA_DIR, 'sessions', file));
          const today = new Date();
          return stats.mtime.toDateString() === today.toDateString();
        }).length;
      
      safeResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({
        totalSessions,
        todaySessions,
        totalParticipants: 0, // À implémenter: compter les participants uniques
        averageDuration: 0,   // À implémenter: calculer la durée moyenne des sessions
      }));
    } catch (error) {
      console.error('Error getting stats:', error);
      safeResponse(500, { 'Content-Type': 'application/json' }, JSON.stringify({ 
        success: false, 
        message: 'Erreur lors de la récupération des statistiques' 
      }));
    }
    
    return;
  }

  // API pour obtenir la liste des sessions
  if (req.method === 'GET' && pathname === '/api/admin/sessions') {
    // Vérifier l'authentification
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      safeResponse(401, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'Non autorisé' }));
      return;
    }
    
    try {
      // Récupérer les fichiers de session
      const sessionDir = path.join(DATA_DIR, 'sessions');
      const sessionFiles = fs.readdirSync(sessionDir)
        .filter(file => file.endsWith('.json'));
      
      // Limiter à 50 sessions les plus récentes
      const recentSessions = sessionFiles
        .map(file => {
          const stats = fs.statSync(path.join(sessionDir, file));
          return {
            id: file.split('_')[0],
            file,
            date: stats.mtime,
            type: file.split('_')[1]
          };
        })
        .sort((a, b) => b.date - a.date)
        .slice(0, 50);
      
      // Charger les données des sessions
      const sessions = recentSessions.map(session => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(sessionDir, session.file), 'utf8'));
          return {
            id: session.id,
            participantUsername: data.userId || 'Anonyme',
            date: session.date,
            type: session.type,
            duration: (data.endTime && data.startTime) ? Math.floor((data.endTime - data.startTime) / 1000) : 0,
            filename: session.file
          };
        } catch (err) {
          return {
            id: session.id,
            date: session.date,
            type: session.type,
            error: 'Erreur lors de la lecture du fichier'
          };
        }
      });
      
      safeResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error getting sessions:', error);
      safeResponse(500, { 'Content-Type': 'application/json' }, JSON.stringify({ 
        success: false, 
        message: 'Erreur lors de la récupération des sessions' 
      }));
    }
    
    return;
  }

  // API pour exporter les données (JSON uniquement)
  if (req.method === 'GET' && pathname === '/api/admin/export') {
    // Vérifier l'authentification
    if (CONFIG.ENABLE_AUTH && !verifySessionToken(req)) {
      safeResponse(401, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'Non autorisé' }));
      return;
    }
    
    try {
      // Créer un fichier ZIP contenant tous les fichiers JSON
      const archiver = require('archiver');
      
      if (responseHandled) return;
      responseHandled = true;
      
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="emotion-data-export-${new Date().toISOString().split('T')[0]}.zip"`
      });
      
      const archive = archiver('zip', {
        zlib: { level: 9 } // Niveau de compression maximum
      });
      
      archive.pipe(res);
      
      // Ajouter le dossier des sessions JSON
      const sessionDir = path.join(DATA_DIR, 'sessions');
      if (fs.existsSync(sessionDir)) {
        const sessionFiles = fs.readdirSync(sessionDir).filter(file => file.endsWith('.json'));
        sessionFiles.forEach(file => {
          archive.file(path.join(sessionDir, file), { name: `sessions/${file}` });
        });
      }
      
      archive.finalize();
      return;
    } catch (error) {
      console.error('Error exporting data:', error);
      safeResponse(500, { 'Content-Type': 'application/json' }, JSON.stringify({ 
        success: false, 
        message: 'Erreur lors de l\'exportation des données' 
      }));
    }
    
    return;
  }
});

server.listen(CONFIG.PORT, () => {
  console.log(`Server running at http://localhost:${CONFIG.PORT}/`);
  console.log(`Data is being stored in JSON format in: ${path.join(DATA_DIR, 'sessions')}`);
  console.log('Press Ctrl+C to stop the server');
});