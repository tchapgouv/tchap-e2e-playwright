# Custom templates for tchap

## Templates

MAS templates are overriden with the script `tools/build_conf.sh`

MAS templates needs the static resources from the frontend app.

To reload automatically the server when a template is modified, use the script `start-local-mas-hot-reload.sh`

## Static resources

The manifest.json is extended in the vite config : `$MAS_HOME/frontend/tchap/vite.tchap.config.ts`

Serve directory is defined in the config.yaml, by default it is `path: "./frontend/dist/"`

```
http:
  listeners:
    - name: web
      resources:
        - name: assets
          path: "/resources/manifest.json"

```

See in the logs 

```
2025-06-03T12:28:33.967776Z  INFO mas_cli::commands::server:297 Listening on http://[::]:8080 with resources [Discovery, Human, OAuth, Compat, GraphQL { playground: false, undocumented_oauth2_access: false }, Assets { path: "./frontend/dist/" }, AdminApi] 

```
