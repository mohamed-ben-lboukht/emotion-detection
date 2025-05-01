# Utilisation de l'application Emotion Detection avec Docker

Cette documentation explique comment exécuter l'application Emotion Detection dans un conteneur Docker, ce qui garantit un fonctionnement cohérent sur n'importe quelle plateforme (localhost, GitHub Codespace, environnement de production, etc.).

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) doit être installé sur votre machine
- [Docker Compose](https://docs.docker.com/compose/install/) doit être installé sur votre machine

## Démarrage rapide

1. Clonez le dépôt sur votre machine
2. Naviguez vers le répertoire du projet
3. Exécutez le script de démarrage Docker:

```bash
./docker-start.sh
```

L'application sera accessible à l'adresse: http://localhost:3001

## Commandes utiles

- **Démarrer l'application**: `docker-compose up -d`
- **Arrêter l'application**: `docker-compose down`
- **Voir les logs**: `docker-compose logs -f`
- **Reconstruire l'image**: `docker-compose build`
- **Redémarrer l'application**: `docker-compose restart`

## Configuration manuelle

Si vous préférez ne pas utiliser le script de démarrage, vous pouvez:

1. Créer les répertoires nécessaires:
   ```bash
   mkdir -p data/sessions
   mkdir -p backups
   ```

2. Construire l'image Docker:
   ```bash
   docker-compose build
   ```

3. Démarrer le conteneur:
   ```bash
   docker-compose up -d
   ```

## Utilisation dans GitHub Codespaces

1. Ouvrez votre projet dans GitHub Codespaces
2. Ouvrez un terminal et exécutez:
   ```bash
   ./docker-start.sh
   ```
3. Cliquez sur le lien "Ports" dans l'interface Codespaces et localisez le port 3001 pour accéder à l'application

## Déploiement sur un serveur

1. Transférez les fichiers suivants sur votre serveur:
   - `Dockerfile`
   - `docker-compose.yml`
   - `.dockerignore`
   - `docker-start.sh`
   - Le contenu du projet

2. Exécutez le script de démarrage:
   ```bash
   ./docker-start.sh
   ```

## Persistance des données

Les données sont stockées dans les répertoires suivants:
- `./data`: Stocke les données de l'application
- `./backups`: Stocke les sauvegardes

Ces répertoires sont montés comme volumes dans le conteneur Docker, ce qui signifie que les données sont conservées même si vous redémarrez ou reconstruisez le conteneur.

## Dépannage

1. **L'application ne démarre pas**:
   - Vérifiez que Docker et Docker Compose sont installés
   - Vérifiez les logs avec `docker-compose logs -f`

2. **Impossible d'accéder à l'application**:
   - Vérifiez que le port 3001 n'est pas utilisé par une autre application
   - Vérifiez que le conteneur est en cours d'exécution avec `docker ps`

3. **Erreurs de permission**:
   - Assurez-vous que les répertoires `data` et `backups` ont les permissions appropriées 