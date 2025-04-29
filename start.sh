#!/bin/bash

# Script de démarrage pour l'application Keystroke Dynamics Collector
# Usage: ./start.sh

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Veuillez l'installer avant d'exécuter ce script."
    exit 1
fi

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances..."
    npm install
fi

# Vérifier si les dossiers nécessaires existent
mkdir -p data/sessions

# Démarrer le serveur
echo "Démarrage du serveur sur http://localhost:3000"
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
node server.js 