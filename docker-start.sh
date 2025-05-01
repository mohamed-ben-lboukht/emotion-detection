#!/bin/bash
# Script pour démarrer l'application avec Docker

echo "Démarrage de l'application emotion-detection avec Docker..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier si docker-compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# S'assurer que les répertoires nécessaires existent
mkdir -p data/sessions
mkdir -p backups

# Construire et démarrer les conteneurs
echo "Construire et démarrer les conteneurs..."
docker-compose build
docker-compose up -d

# Vérifier si les conteneurs ont démarré avec succès
if [ $? -eq 0 ]; then
    echo "✅ Application démarrée avec succès!"
    echo "📋 Accédez à l'application à l'adresse: http://localhost:3001"
    echo "📊 Pour voir les logs: docker-compose logs -f"
    echo "🛑 Pour arrêter l'application: docker-compose down"
else
    echo "❌ Erreur lors du démarrage de l'application"
    exit 1
fi 