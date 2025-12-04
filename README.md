
# folder structure

- /playwright : test E2E

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


## launch tests

```bash
cd playwright
playwright % npm test
```

to launch a custom config run (see config.json)

```bash
npm run test:mas01 
```


