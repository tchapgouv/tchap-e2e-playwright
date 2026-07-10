# Playwright Tests for Matrix Authentication Service

Ce projet contient differents tests :

`/auth` : tests Playwright pour tester le scénario d'authentification OIDC avec Keycloak dans le service d'authentification Matrix (MAS). Nécessite un environnement local docker avec les services mockés de https://github.com/tchapgouv/tchap-docker-integration. 

`/integration/api/room-access-rules` : tests d'intégration API pour le module room-access-rules. Nécessite un environnement Tchap complet.

`/integration/api/email-account-validity` : scénario de recette web pour le module remail-account-validity. Nécessite un environnement Tchap complet et un service mailpit

`/integration/web/minimal` : scénario minimal de recette e2e sur navigateur sur les serveurs de DEV (dev01, ext01) et PREPROD (int01, ext01). Nécessite un environnement Tchap complet avec un serveur agent et un serveur externe, ainsi qu'un service mailpit.


## Configuration

Les tests utilisent deux types de fichiers pour la configuration d'un environnement :

- `.env.XXX` - Fichier de configuration principal (non sensible)
- `.secrets.XXX` - Fichier de secrets (sensible, exclu de github)

Vous pouvez modifier le fichier `.env.XXX` pour adapter les tests à votre environnement. Les variables sensibles doivent être placées dans le fichier `.secrets.XXX` correspondant.

### Variables de configuration

Les variables suivantes sont requises pour dev01 et int01 et doivent être placées dans les fichiers `.secrets.XXX` :

- `MAILPIT_PWD=` mot de passe mailpit
- `MAS_ADMIN_CLIENT_ID=` identifiant client admin du MAS
- `MAS_ADMIN_CLIENT_SECRET=` secret client admin du MAS
- `SYNAPSE_ADMIN_TOKEN=` token admin de synapse
- `OTHER_MAS_ADMIN_CLIENT_ID=` identifiant client admin du MAS secondaire
- `OTHER_MAS_ADMIN_SECRET=` secret client admin du MAS secondaire
- `EXTERNAL_MAS_ADMIN_CLIENT_ID=` identifiant client admin du MAS externe
- `EXTERNAL_MAS_ADMIN_SECRET=` secret client admin du MAS externe
- `TEST_USER_PASSWORD=` mot de passe par défaut des users créés

### Fichiers d'exemple

Un fichier `.secrets.sample` est fourni avec des commentaires en anglais expliquant chaque variable. Vous pouvez copier ce fichier pour créer vos propres fichiers de secrets :

```bash
cp .secrets.sample .secrets.dev01
cp .secrets.sample .secrets.int01
# etc...
```

Les fichiers `.secrets.*` sont automatiquement exclus du contrôle de version par le fichier `.gitignore`. Ne commitez jamais de fichiers de secrets contenant des informations sensibles.

## Executer les tests

### avec docker 
```bash
# specific test
docker run -it --rm -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble bash -c 'ENV=dev01 npx playwright test ./tests/integration/api/room-access-rules --grep "Should create private encrypted room with correct properties"'

# tests suite
docker run -it --rm -v .:/app -w /app mcr.microsoft.com/playwright:v1.59.1-noble npm run test:api:dev01
```


### Installation local

Pour initialiser rapidement le projet, utilisez le script d'initialisation :

```bash
# Rendre le script exécutable
chmod +x init.sh

# Exécuter le script d'initialisation
./init.sh

# tests suite
npm run test:room:dev01

# specific test
ENV=dev01 && npx playwright test ./tests/integration/api/room-access-rules --grep "Should create private encrypted room with correct properties"
```



