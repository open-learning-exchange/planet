# Docker for your development environment

## Description
This docker compose can be use for your development environment and very handy, you can spawn the development environment in a matter of seconds and start your development. Your code changes in host folder are automatically reflected to docker and ready to test in your browser.

## How to use

1. Move to `docker/dev` folder
2. Run the following command to spawn your environment for the first time

```
docker-compose -f docker-compose.yml -p planet-dev up --build
```

3. When you're done, you can do the following command

```
docker-compose -f docker-compose.yml -p planet-dev stop
```

4. When you go back to code

```
docker-compose -f docker-compose.yml -p planet-dev start
```

5. When you have to delete the environment

```
docker-compose -f docker-compose.yml -p planet-dev down
```
