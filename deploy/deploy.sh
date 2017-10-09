#!/bin/bash

build_message(){
    # $1 = build message
    echo
    echo =========BUILD MESSAGE=========
    echo "$@"
    echo ===============================
    echo
}

build_docker() {
  build_message Build the docker images ...
  docker build -f ./docker/planet/Dockerfile  ./docker/planet -t $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT_ID ./docker/planet
  docker build -f ./docker/db-init/Dockerfile ./docker/db-init -t $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT_ID ./docker/db-init
}

tag_latest_docker() {
  build_message Tag latest docker images ...
  docker tag $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT_ID $DOCKER_ORG/$DOCKER_REPO:latest
  docker tag $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT_ID $DOCKER_ORG/$DOCKER_REPO:db-init-latest
}

push_docker() {
  build_message Pushing docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT_ID
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT_ID
}

push_latest_docker() {
  build_message Pushing latest docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO:latest
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-latest
}

DOCKER_ORG=treehouses
DOCKER_REPO=planet-dev
VERSION=$(cat package.json | grep version | awk '{print$2}' | awk '{print substr($0, 2, length($0) - 3)}')
BRANCH=$TRAVIS_BRANCH

docker login -u $DOCKER_USER -p $DOCKER_PASS
build_docker
push_docker
if [[ $BRANCH = master ]];
  then
  tag_latest_docker
  push_latest_docker
fi
