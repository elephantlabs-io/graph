# Database For Graph
This contains the definition of our custom PostgreSQL image. It just the normal
bitnami postgresql image with our initialization SQL files already loaded into
it.


## Build
```bash
podman build -t localhost/elephantlabs-io/postgresql:<version>
```

## Run

A very basic and simple run command looks like:
```bash
podman run -e POSTGRESQL_PASSWORD=test --rm -d localhost/elephantlabs-io/postgresql:17.5.0
```

For more information on how to use the Bitnami PostgreSQL Image click [here](https://hub.docker.com/r/bitnami/postgresql)

