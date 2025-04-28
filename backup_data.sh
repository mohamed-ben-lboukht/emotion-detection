#!/bin/bash
# Script de sauvegarde des données d'émotions et de frappe
# Usage: ./backup_data.sh [nom_de_dossier]

# Dossier de destination
BACKUP_DIR="backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME=${1:-"backup_$DATE"}

# Créer le dossier de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Sauvegarder les fichiers CSV
echo "Sauvegarde des fichiers CSV..."
cp -v data/*.csv "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || echo "Aucun fichier CSV trouvé."

# Sauvegarder les fichiers JSON de session
echo "Sauvegarde des sessions JSON..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/sessions"
cp -v data/sessions/*.json "$BACKUP_DIR/$BACKUP_NAME/sessions/" 2>/dev/null || echo "Aucun fichier JSON trouvé."

echo "Sauvegarde terminée dans $BACKUP_DIR/$BACKUP_NAME"
echo "Statistiques de la sauvegarde :"
find "$BACKUP_DIR/$BACKUP_NAME" -type f | wc -l | xargs echo "Nombre de fichiers sauvegardés :"
du -sh "$BACKUP_DIR/$BACKUP_NAME" | awk '{print "Taille totale : " $1}'