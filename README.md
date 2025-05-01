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