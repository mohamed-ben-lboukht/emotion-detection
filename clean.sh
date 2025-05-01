#!/bin/bash
# Script de nettoyage pour le projet emotion-detection
# À exécuter périodiquement pour nettoyer les fichiers temporaires

echo "Nettoyage du projet emotion-detection..."

# Conserver seulement la sauvegarde la plus récente
echo "Nettoyage des anciennes sauvegardes..."
cd "$(dirname "$0")"
if [ -d "backups" ]; then
  # Conserver uniquement la sauvegarde la plus récente
  ls -t backups/data_backup_*.tar.gz | tail -n +2 | xargs -I {} rm {} 2>/dev/null
  echo "✓ Anciennes sauvegardes supprimées"
fi

# Nettoyer les fichiers temporaires
echo "Suppression des fichiers temporaires..."
find . -name "*.tmp" -type f -delete
find . -name "*.log" -type f -delete
find . -name ".DS_Store" -type f -delete
echo "✓ Fichiers temporaires supprimés"

# Optimisation des dépendances
echo "Optimisation des dépendances Node.js..."
if [ -f "package.json" ]; then
  npm prune --production
  echo "✓ Dépendances optimisées"
fi

# Compresser les anciens fichiers de données
echo "Compression des anciennes données..."
if [ -d "data/sessions" ]; then
  # Compresser les fichiers de plus de 30 jours
  find data/sessions -name "*.json" -type f -mtime +30 -exec gzip {} \;
  echo "✓ Anciennes données compressées"
fi

echo "Nettoyage terminé !" 