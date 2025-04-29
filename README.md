# Keystroke Dynamics & Emotion Detection

Ce projet collecte et analyse les dynamiques de frappe au clavier, avec une option de détection automatique des émotions via webcam dans le mode dédié.

## Fonctionnalités

- **Collecte des dynamiques de frappe** (temps entre les touches, durée d'appui, etc.)
- **Trois modes de collecte** :
  - Frappe libre avec saisie manuelle des émotions
  - Frappe avec contexte musical et saisie manuelle des émotions
  - Frappe avec caméra et **détection automatique des émotions** via webcam
- **Visualisation des données** collectées
- **Stockage local** des données au format JSON (exclusivement)

## Structure du projet

```
emotion-detection/
├── server.js            # Serveur Node.js simple avec sécurité améliorée
├── index.html           # Interface utilisateur principale
├── js/
│   ├── emotions.js      # Logique de traitement des émotions
│   ├── keystroke.js     # Collecte des dynamiques de frappe
│   ├── webcam.js        # Gestion de la webcam et détection faciale
│   ├── main.js          # Logique principale de l'application
│   └── lib/
│       └── face-api.min.js  # Bibliothèque de détection faciale
├── css/
│   └── styles.css       # Styles de l'interface
├── models/
│   └── face-api-models/ # Modèles de détection d'émotions
├── admin/               # Interface d'administration
│   ├── login.html       # Page de connexion admin
│   ├── dashboard.html   # Tableau de bord admin
│   └── auth.js          # Gestion de l'authentification
└── data/                # Stockage des données collectées
    └── sessions/        # Sessions individuelles enregistrées en JSON
```

## Installation

1. Clonez ce dépôt
2. Assurez-vous d'avoir Node.js installé
3. Pour une installation complète avec gestion des dépendances (recommandé) :
   ```
   npm install
   ```
4. Lancez le serveur avec :
   ```
   ./start.sh
   ```
   ou
   ```
   node server.js
   ```
5. Ouvrez http://localhost:3000 dans votre navigateur

## Améliorations de sécurité

Le serveur inclut désormais plusieurs améliorations de sécurité :

- **Rate limiting** : Protection contre les attaques par force brute
- **Protection CSRF** : Jetons de protection contre les attaques cross-site request forgery
- **Limitation des tentatives de connexion** : Verrouillage temporaire après plusieurs échecs d'authentification
- **En-têtes de sécurité renforcés** : Protection XSS, Content Security Policy, etc.
- **Sanitisation des entrées utilisateur** : Nettoyage de toutes les données entrantes
- **Gestion sécurisée des sessions** : Sessions avec expiration et tokens aléatoires

## Stockage des données

Les données sont maintenant stockées exclusivement au format JSON :

- Chaque session est enregistrée dans un fichier JSON séparé
- Format standardisé pour faciliter l'analyse ultérieure
- Meilleure structuration des données (par rapport au format CSV précédent)
- Support natif des objets et tableaux complexes pour les données émotionnelles

## Comment utiliser

1. Choisissez un mode de collecte :
   - **Free Typing** : Frappe libre avec saisie manuelle des émotions
   - **Music Context** : Frappe avec musique et saisie manuelle des émotions
   - **Camera Context** : Frappe avec détection automatique des émotions par webcam

2. Si vous choisissez le mode caméra, accordez l'accès à la webcam quand demandé

3. Commencez à taper dans la zone de texte

4. Sauvegardez vos données en cliquant sur "Save Data"
   - Dans les modes sans caméra, vous devrez indiquer manuellement vos émotions
   - Dans le mode caméra, un résumé des émotions détectées sera affiché

5. Consultez les données collectées via le bouton "View Your Data"

## Fonctionnement technique

### Détection d'émotions (mode caméra uniquement)
L'application utilise face-api.js pour détecter les émotions à partir du flux vidéo de la webcam. Les modèles détectent les expressions faciales et extraient les émotions dominantes (joie, tristesse, colère, surprise, peur, dégoût, neutralité).

### Dynamiques de frappe
L'application collecte :
- Temps entre les pressions de touche
- Durée d'appui sur chaque touche
- Vitesse de frappe globale
- Motifs de frappe spécifiques

### Stockage des données
Les données sont stockées localement en format JSON et peuvent être téléchargées pour analyse ultérieure.

## Privacy & Security

- All data is stored securely on the server in JSON format
- The webcam feed is processed locally and is not stored as video - only emotion data is saved
- No personal identifiers are collected - users are identified by randomly generated UUIDs
- All communications with the server are protected with security headers
- Data is sanitized before storage to prevent injection attacks

## Dépendances

- face-api.js - Détection faciale et analyse des émotions
- Node.js - Serveur local
- (optionnel) bcrypt - Pour le hachage sécurisé des mots de passe (à installer si nécessaire)

## Administration

L'application inclut une interface d'administration sécurisée :

1. Accédez à http://localhost:3000/admin/login
2. Connectez-vous avec les identifiants par défaut (à changer en production) :
   - Utilisateur : admin
   - Mot de passe : changeme123
3. Le tableau de bord permet de :
   - Visualiser les statistiques des sessions
   - Exporter les données au format JSON
   - Gérer les paramètres de l'application

**IMPORTANT** : Pour un déploiement en production, modifiez les identifiants par défaut et configurez les variables d'environnement pour une meilleure sécurité.

## Scripts utilitaires

- **start.sh** : Démarre l'application simplement
- **backup_data.sh** : Sauvegarde les données collectées

## Setup Instructions

This is a simple web application that runs in any modern browser. No special installation is required.

### Running Locally

1. Download or clone the repository
2. Open the `index.html` file in a web browser
   - For webcam functionality, you need to run the app through a web server due to security restrictions
   - You can use a simple local server like Python's built-in server:
     ```
     # Python 3
     python -m http.server
     
     # Python 2
     python -m SimpleHTTPServer
     ```
   - Then access the app at http://localhost:8000

### Music Files

For the music-based tracking to work, you need to add music files in the `assets/music/` directory:
- `happy.mp3`
- `sad.mp3`
- `energetic.mp3`
- `calm.mp3`

## Features

### Keystroke Data Collection

All three tracking methods collect the following keystroke timing data:
- **press-press**: Time between consecutive key presses
- **press-release**: Time a key is held down
- **release-release**: Time between consecutive key releases
- **release-press**: Time between a key release and the next key press

All times are measured in milliseconds.

### Emotion Collection
- **Free Typing & Music Context**: Users manually report their emotional state using sliders
- **Camera Context**: Emotions are automatically detected from facial expressions in real-time

### Data Storage

All collected data is stored on the server as JSON files:
- Session files are organized by type (manual, music, webcam)
- You can view summaries of collected data
- Each session contains keystroke timings, text, and emotional data
- Data can be exported as JSON files for further analysis

### User Interface Features
- Visualization of emotion summaries before saving
- Session browser for reviewing past typing sessions
- Direct viewing of session data contents
- Easy data export for analysis

## Browser Compatibility

This application works on modern browsers including:
- Chrome (Recommended)
- Firefox
- Edge
- Safari

## Technical Notes

- This app uses vanilla JavaScript without external frameworks
- Keystroke timing is captured using the browser's performance API
- The webcam emotion detection in this simple version is simulated for demonstration purposes 