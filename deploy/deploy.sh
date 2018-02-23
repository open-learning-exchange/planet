#!/bin/bash

DOCKER_ORG=treehouses
DOCKER_REPO=planet
DOCKER_REPO_DEV=planet-dev
VERSION=$(cat package.json | grep version | awk '{print$2}' | awk '{print substr($0, 2, length($0) - 3)}')
BRANCH=$TRAVIS_BRANCH
COMMIT=${TRAVIS_COMMIT::8}

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
  docker build -f ./docker/planet-dev/Dockerfile -t $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION-$BRANCH-$COMMIT ./docker/planet-dev
  docker build -f ./docker/planet/Dockerfile -t $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT .
  docker build -f ./docker/db-init/Dockerfile -t $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT .
}

tag_latest_docker() {
  build_message Tag latest docker images ...
  docker tag $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO_DEV:latest
  docker tag $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:latest
  docker tag $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:db-init-latest
}

tag_versioned_docker() {
  build_message Tag latest docker images ...
  docker tag $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION
  docker tag $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:$VERSION
  docker tag $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION
}

push_docker() {
  build_message Pushing docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION-$BRANCH-$COMMIT
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT
  sleep 5s
}

push_latest_docker() {
  build_message Pushing latest docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO_DEV:latest
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:latest
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-latest
  sleep 5s
}

push_versioned_docker() {
  build_message Pushing latest docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO_DEV:$VERSION
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:$VERSION
  sleep 5s
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION
  sleep 5s
}

docker login -u $DOCKER_USER -p $DOCKER_PASS
build_docker
push_docker
if [[ $BRANCH = master ]];
  then
  tag_latest_docker
  push_latest_docker
fi

if [[ ! -z "${TRAVIS_TAG}" ]]
  then
  tag_versioned_docker
  push_versioned_docker
fi

build_message Building Raspberry Pi docker image...
ssh -o StrictHostKeyChecking=no -p 22 travis@kraken.ole.org 'bash -s' -- < ./deploy/deploy_rpi.sh --branch="$BRANCH" --commit="$TRAVIS_COMMIT" --pull="$TRAVIS_PULL_REQUEST" --duser="$DOCKER_USER" --dpass="$DOCKER_PASS" --gtag="$TRAVIS_TAG"
