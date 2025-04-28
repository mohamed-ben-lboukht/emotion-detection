#!/bin/bash
# Script de sauvegarde quotidienne du dossier data/
# Usage : ./backup_data.sh

BACKUP_DIR="backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
ARCHIVE_NAME="data_backup_$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" data/
echo "Sauvegarde terminée : $BACKUP_DIR/$ARCHIVE_NAME"