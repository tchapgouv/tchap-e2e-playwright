# Playwright Tests for Matrix Authentication Service

Ce projet contient differents tests :

`/auth` : tests Playwright pour tester le scénario d'authentification OIDC avec Keycloak dans le service d'authentification Matrix (MAS). Nécessite un environnement local docker avec les services mockés de https://github.com/tchapgouv/tchap-docker-integration. 

`/integration/room-access-rules` : tests d'intégration API pour le module room-access-rules. Nécessite un environnement Tchap complet.

`/integration/email-account-validity` : scénario de recette web pour le module remail-account-validity. Nécessite un environnement Tchap complet et un service mailpit

`/integration/minimal` : scénario minimal de recette e2e sur navigateur sur les serveurs de DEV (dev01, ext01) et PREPROD (int01, ext01). Nécessite un environnement Tchap complet avec un serveur agent et un serveur externe, ainsi qu'un service mailpit.


## Configuration

Les tests utilisent un fichier `.env.XXX` pour la configuration d'un environnement. Vous pouvez modifier ce fichier pour adapter les tests à votre environnement.

Requis pour dev01 et int01:
`MAILPIT_PWD=` mailpit password
`MAS_ADMIN_CLIENT_ID=` client admin du MAS
`MAS_ADMIN_CLIENT_SECRET=` client admin du MAS
`SYNAPSE_ADMIN_TOKEN=` token admin de synapse

## Executer les tests

### avec docker 
```bash
# specific test
docker run -it --rm -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble bash -c ENV=dev01 && npx playwright test ./tests/integration/room-access-rules --grep "Should create private encrypted room with correct properties"

# tests suite
docker run -it --rm -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble npm run test:room:dev02
```


### Installation local

Pour initialiser rapidement le projet, utilisez le script d'initialisation :

```bash
# Rendre le script exécutable
chmod +x init.sh

# Exécuter le script d'initialisation
./init.sh

# tests suite
npm run test:room:dev02

# specific test
ENV=dev01 && npx playwright test ./tests/integration/room-access-rules --grep "Should create private encrypted room with correct properties"
```



