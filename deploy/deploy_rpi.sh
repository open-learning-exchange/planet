#!/bin/bash
####### Parse commandline arguments  #####################
for i in "$@"
do
case $i in
    -u=*|--duser=*)
      duser="${i#*=}"
      ;;
    -k=*|--dpass=*)
      dpass="${i#*=}"
      ;;
    -b=*|--branch=*)
        branch="${i#*=}"
        ;;
    -c=*|--commit=*)
        commit="${i#*=}"
        ;;
    -p=*|--pull=*)
        pull="${i#*=}"
        ;;
    *)
    echo "usage: deploy_rpi.sh -b=<branch-name>|--branch=<branch-name>"
    echo "usage: deploy_rpi.sh -c=<commit-sha>|--commit=<commit-sha>"
    echo "usage: deploy_rpi.sh -p=<pull-request-number>|--pull=<pull-request-number>"
    echo "usage: deploy_rpi.sh -u=<docker-user-name>|--duser=<docker-user-name>"
    echo "usage: deploy_rpi.sh -k=<dokcer-password>|--dpass=<docker-password>"
    exit 1;
    ;;
esac
done
##########################################################

build_message(){
    # $1 = build message
    echo
    echo =========BUILD MESSAGE=========
    echo "$@"
    echo ===============================
    echo
}

random_generator(){
    awk -v min=10000000 -v max=99999999 'BEGIN{srand(); print int(min+rand()*(max-min+1))}'
}

login_docker(){
    DOCKER_USER="$duser"
    DOCKER_PASS="$dpass"
    docker login --username=$DOCKER_USER --password=$DOCKER_PASS
}

clone_branch(){
    cd /tmp && rm -rf "planet-$RANDOM_FINGERPRINT";
    git clone -b "$branch" https://github.com/ole-vi/planet.git "planet-$RANDOM_FINGERPRINT" && cd "planet-$RANDOM_FINGERPRINT" || exit
    git checkout "$commit"
    TEST_DIRECTORY=/tmp/"planet-$RANDOM_FINGERPRINT"
}

clone_pr(){
    TEMPORARY_BRANCH="travis-build"
    cd /tmp && rm -rf "planet-$RANDOM_FINGERPRINT";
    git clone https://github.com/ole-vi/planet.git "planet-$commit-$pull" && cd "planet-$commit-$pull" || exit
    git fetch origin pull/"$pull"/head:"$TEMPORARY_BRANCH"
    git checkout "$TEMPORARY_BRANCH"
    TEST_DIRECTORY=/tmp/"planet-$commit-$pull"
}

remove_temporary_folders(){
    if [ -z "$pull" ]
    then
	rm -rf "$TEST_DIRECTORY"
    else
	rm -rf "$TEST_DIRECTORY"
    fi
}

build_docker() {
  build_message Build the docker images ...
  build_message Deploy planet as $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT-rpi
  build_message Deploy db-init as $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT-rpi
  docker build -f ./docker/planet/rpi-Dockerfile  ./docker/planet -t $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT-rpi
  docker build -f ./docker/db-init/rpi-Dockerfile ./docker/db-init -t $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT-rpi
}

tag_latest_docker() {
  build_message Tag latest docker images ...
  docker tag $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:latest-rpi
  docker tag $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT $DOCKER_ORG/$DOCKER_REPO:db-init-latest-rpi
}

push_docker() {
  build_message Pushing docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT-rpi
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT-rpi
}

push_latest_docker() {
  build_message Pushing latest docker images ...
  docker push $DOCKER_ORG/$DOCKER_REPO:latest-rpi
  docker push $DOCKER_ORG/$DOCKER_REPO:db-init-latest-rpi
}

RANDOM_FINGERPRINT=$(random_generator)
login_docker
DOCKER_ORG=treehouses
DOCKER_REPO=planet-dev
BRANCH=$branch
COMMIT=${commit::8}

clone_branch

VERSION=$(cat package.json | grep version | awk '{print$2}' | awk '{print substr($0, 2, length($0) - 3)}')

build_docker
push_docker
if [[ $BRANCH = master ]];
  then
  tag_latest_docker
  push_latest_docker
fi

remove_temporary_folders
