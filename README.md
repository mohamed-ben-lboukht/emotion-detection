# Emotion Detection - Application Dockerisée

Application web pour la détection d'émotions et la collecte de données de frappe au clavier.

## Fonctionnalités

- Détection d'émotions via webcam
- Interface utilisateur intuitive
- Stockage sécurisé des données
- Déploiement facile avec Docker

## Installation et démarrage rapide

### Avec Docker (Recommandé)

1. Assurez-vous d'avoir Docker et Docker Compose installés
2. Clonez ce dépôt
3. Exécutez le script de démarrage:

```bash
./docker-start.sh
```

L'application sera accessible à l'adresse: http://localhost:3001

### Sans Docker

1. Assurez-vous d'avoir Node.js (version 14+) installé
2. Clonez ce dépôt
3. Installez les dépendances:

```bash
npm install
```

4. Démarrez l'application:

```bash
npm start
```

L'application sera accessible à l'adresse: http://localhost:3001

## Structure du projet

```
emotion-detection/
├── app.js                  # Serveur Express principal
├── package.json            # Configuration npm
├── data/                   # Dossier de stockage des données
│   └── sessions/           # Données de session stockées en JSON
├── public/                 # Fichiers statiques
│   ├── index.html          # Page principale
│   ├── styles.css          # Styles CSS
│   ├── js/                 # Scripts JavaScript 
│   └── models/             # Modèles de détection d'émotions
├── Dockerfile              # Configuration Docker
├── docker-compose.yml      # Configuration Docker Compose
└── admin/                  # Interface d'administration
```

## Déploiement

### Sur Render.com

Le fichier `render.yaml` permet un déploiement facile sur [Render.com](https://render.com).

### Sur d'autres plateformes

Suivez les instructions dans le fichier [DOCKER_README.md](DOCKER_README.md) pour les détails de déploiement sur d'autres plateformes.

## Maintenance

Pour nettoyer le projet et supprimer les fichiers temporaires:

```bash
./clean.sh
```

## Sécurité

L'application implémente plusieurs mesures de sécurité:
- En-têtes de sécurité HTTP
- Sanitization des données
- CSP (Content Security Policy)
- Rate limiting

## Licence

Ce projet est sous licence MIT.

# Emotion Detection App

This app captures and analyzes emotions during typing sessions, with data persistence in MongoDB.

## Setup for Data Persistence on Render

### 1. Create a MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (the free tier is sufficient)
3. Create a database user with password
4. In Network Access, allow access from everywhere (or specify your Render IP)
5. Get your connection string from "Connect" > "Connect your application"

### 2. Configure Environment Variables on Render
Add the following environment variables to your Render deployment:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/emotion-detection?retryWrites=true&w=majority
PORT=3000
ADMIN_PASSWORD=admin123
```

Replace the `MONGODB_URI` with your actual MongoDB connection string, and change the admin password.

### 3. How to Access Your Data

#### From Admin Dashboard
1. Go to `/admin/dashboard` in your application
2. Use the "MongoDB Data" section to:
   - Load MongoDB data
   - Download all data
   - Extract to JSON files

#### From API Endpoints
- `/api/sessions` - Get all sessions as JSON
- `/api/json-files` - Browse and download JSON files
- `/view-data` - View both MongoDB and JSON data

### 4. Testing the MongoDB Connection

To check if your MongoDB connection is working correctly:
1. Go to `/admin/dashboard`
2. Click "Load MongoDB Data"
3. You should see your sessions listed in a table

All typed data is now automatically saved to both local JSON files and MongoDB. The MongoDB data will persist even when Render restarts your application. 