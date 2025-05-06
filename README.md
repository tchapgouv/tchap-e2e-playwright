
# folder structure

- /.github custom CI (if needed)
- /conf : configuration du MAS special tchap
- /playwright : test E2E
- /ressources : custom html templates, css and manifest.json
- /tools : for local dev
- /translations : tchap custom labels
- /wiremock : mock http response for identity server sydent


export $MAS_HOME : path of /matrix-authentication-service, fork léger https://github.com/tchapgouv/matrix-authentication-service
export $MAS_TCHAP_HOME : path of /matrix-authentication-service-tchap


# playwright tests

## setup synapse

checkout la branche : https://github.com/tchapgouv/element-docker-demo/tree/local-dev

```element-docker-demo % ./setup_tchap.sh ```
 > tchapgouv.com
 > Use local mkcert CA for SSL? [y/n] y

.env and SSL configured; you can now docker compose up

```element-docker-demo % ./start_tchap_light.sh ```


> dependency failed to start: container element-docker-demo-postgres-1 is unhealthy

Postgres met du temps à démarrer, relancer synapse puis nginx à la main 

créer un compte à https://element.tchapgouv.com/

> L’inscription a été désactivée sur ce serveur d’accueil.

c'est normal le MAS n'est pas démarré

## setup MAS


- launch postres services

Create .env and personalize it if needed

```bash
cp .env.sample .env
matrix-authentication-service-tchap % ./start-local-stack.sh
```

keycloak container might take some time to start up

```bash
export MAS_HOME=/Users/olivier/workspace/beta/Tchap/matrix-authentication-service
./start-local-mas.sh
```

Recharger la page https://element.tchapgouv.com/, le MAS est accessible

## launch tests

```bash
playwright % npm test
```

to launch a custom config run (see config.json)

```bash
npm run test:mas01 
```


