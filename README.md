# Playwright Tests for Matrix Authentication Service

Ce projet contient des tests Playwright pour tester le scénario d'authentification OIDC avec Keycloak dans le service d'authentification Matrix (MAS).

Cela contient également un script complet avec les tests minimaux Tchap

## Démarrage des services en local
TODO

## Executer les tests minimaux avec docker 

```bash
docker run -it --rm --ipc=host -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble npm run test:dev01
docker run -it --rm --ipc=host -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble npm run test:int01
```

## Installation local

Pour initialiser rapidement le projet, utilisez le script d'initialisation :

```bash
# Rendre le script exécutable
chmod +x init.sh

# Exécuter le script d'initialisation
./init.sh
```

## Configuration

Les tests utilisent un fichier `.env` pour la configuration. Vous pouvez modifier ce fichier pour adapter les tests à votre environnement.

Requis pour dev01 et int01 (preprod):
`MAILPIT_PWD=` mailpit password

## Exécution les tests

```bash
# Exécuter tous les tests MAS en local
ENV=local npm run test tests/auth --retries=2  


# Exécuter les tests minimaux sur dev ou int01 (preprod)
ENV=int01 npm run test tests/minimal
ENV=dev01 npm run test tests/minimal  
```

