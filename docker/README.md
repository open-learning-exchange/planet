# Planet & Docker
We decide to package our application in a docker container. We believe that with small standalone containerized application, we can ship more educational app to our Rasbperry Pi Package. We also have a plan to put container management integration as part of our planet app.

## Description
This folder contains most of our docker secret sauce and recipe.

### What is Docker
Docker means many things to many people. In simplest form we can say that docker is a way to containerized or put into a box (mental box) our app. So that when we run our app it is isolated to some degree from the host. It is basically a next level of VM, docker container basically can answer many problem that we want to achieve with VM, but with docker container it is more simple and resource-friendly. A docker container can run in Raspberry Pi, but VM in Raspberry Pi is insane. Docker helps us to have different isolated environment (deploying some apps) without polluting our host machine.

### Components
We have several docker components in our application there are
* Planet. There are two version, one is for production and one is for development.
  * Planet for production. It basically our production optimized Planet (sometimes served via Nginx).
  * Planet for development. It basically a runtime that make it possible for Planet to run (mostly node.js)
* CouchDB. It basically a CouchDB container and it developed in the different project. You can access it here in [ole-vi/rpi-couchdb](https://github.com/ole-vi/rpi-couchdb)
* CouchDB initialization data a.k.a. `db-init`. It contains all the schema necessary for our Planet to run.

### Target Architecture
Because we want to run our production Planet mostly in Raspberry Pi, the target architecture of our app are
* ARM (for production app run in the field running in Raspberry Pi, mostly for community)
* x86 (for production Nation)

### Docker-related files
* Docker file (`Dockerfile`)
* Docker compose file (`docker-compose.yml`)

This docker compose can be use for your development environment and very handy, you can spawn the development environment in a matter of seconds and start your development. Your code changes in host folder are automatically reflected to docker and ready to test in your browser.

## How to use
I will divide this how to use into two sections, for development and for production. It is interesting to run our development environment on top of isolated docker container.

### For Production

1. Move to `srv/planet` folder
2. Run the following command to spawn your environment for the first time
   (Optional: update planet.yml with the latest or a specific images from https://hub.docker.com/r/treehouses/planet/tags/)

```
docker-compose -f planet.yml -p planet up -d --build
```

See if the docker containers running

```
docker ps
```

You'll see you containers like this

```
CONTAINER ID   IMAGE                      COMMAND                  CREATED         STATUS         PORTS                                                             NAMES
0914c167f20e   d14b10ade528               "/bin/sh -c ./docker…"   2 weeks ago     Up 2 seconds   0.0.0.0:80->80/tcp, [::]:80->80/tcp, 443/tcp                      planet-prod-planet-1
42d4b4ea3826   898294509ee6               "npm run start"          2 weeks ago     Up 2 seconds   0.0.0.0:5400->5400/tcp, [::]:5400->5400/tcp                       planet-prod-chatapi-1
c03b86dfede9   9859c264e24e               "/bin/sh -c 'bash ./…"   2 weeks ago     Up 2 seconds                                                                     planet-prod-db-init-1
f7ddb76ae6b6   treehouses/couchdb:2.3.1   "tini -- /docker-ent…"   14 months ago   Up 2 seconds   4369/tcp, 9100/tcp, 0.0.0.0:2200->5984/tcp, [::]:2200->5984/tcp   planet-prod-couchdb-1
```

Connect to your `planet-prod-planet-1` with

```
docker logs {{id}}
```

in this case

```
docker logs 0914c167f20e -f
```

press `CTRL+C` to exit logs view

3. When you're done, you can do the following command

```
docker-compose -f planet.yml -p planet stop
```

4. When you go back to code

```
docker-compose -f planet.yml -p planet start
```

5. When you have to delete the environment

```
docker-compose -f planet.yml -p planet down
```

Remember when your containers active you can always look to your containers logs to see whats going on on the background.
