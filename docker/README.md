# Docker for your development environment

## Description
This docker compose can be use for your development environment and very handy, you can spawn the development environment in a matter of seconds and start your development. Your code changes in host folder are automatically reflected to docker and ready to test in your browser.

## How to use

1. Move to `docker` folder
2. Run the following command to spawn your environment for the first time

```
docker-compose -f planet-dev.yml -p planet-dev up -d --build
```

See if the docker containers running

```
docker ps
```

You'll see you containers like this

```
CONTAINER ID        IMAGE               COMMAND                  CREATED              STATUS              PORTS                                                                NAMES
ea3b914c3193        planetdev_planet    "/bin/sh -c 'bash ..."   About a minute ago   Up 58 seconds       0.0.0.0:3000->3000/tcp                                               planetdev_planet_1
57f30698ccda        klaemo/couchdb      "tini -- /docker-e..."   About a minute ago   Up About a minute   4369/tcp, 9100/tcp, 0.0.0.0:2200->5984/tcp, 0.0.0.0:2201->5986/tcp   planetdev_couchdb_1
```

Connect to your `planetdev_planet` with

```
docker logs {{id}}
```

in this case

```
docker logs ea3b914c3193 -f
```

press `CTRL+C` to exit logs view

3. When you're done, you can do the following command

```
docker-compose -f planet-dev.yml -p planet-dev stop
```

4. When you go back to code

```
docker-compose -f planet-dev.yml -p planet-dev start
```

5. When you have to delete the environment

```
docker-compose -f planet-dev.yml -p planet-dev down
```

Remember when your containers active you can always look to your containers logs to see whats going on on the background.
