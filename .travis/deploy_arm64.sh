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
    -t=*|--gtag=*)
        gtag="${i#*=}"
        ;;
    -i=*|--image=*)
        image="${i#*=}"
        ;;
    *)
    echo "usage: deploy_arm64.sh -b=<branch-name>|--branch=<branch-name>"
    echo "usage: deploy_arm64.sh -c=<commit-sha>|--commit=<commit-sha>"
    echo "usage: deploy_arm64.sh -p=<pull-request-number>|--pull=<pull-request-number>"
    echo "usage: deploy_arm64.sh -u=<docker-user-name>|--duser=<docker-user-name>"
    echo "usage: deploy_arm64.sh -k=<docker-password>|--dpass=<docker-password>"
    exit 1;
    ;;
esac
done
##########################################################

set -e

build_message(){
    # $1 = build message
    echo
    echo =========BUILD MESSAGE=========
    echo "$@"
    echo ===============================
    echo
}

echo "The current directory is: $(pwd)"
source ./.travis/travis_utils.sh
prepare_ci

if [[ $image = db-init ]]
  then
  prepare_db_init_arm64
  deploy_docker './docker/db-init/arm64-Dockerfile' $DOCKER_DB_INIT_ARM64 $DOCKER_DB_INIT_ARM64_LATEST
  deploy_tag $DOCKER_DB_INIT_ARM64 $DOCKER_DB_INIT_ARM64_VERSIONED
fi

if [[ $image = planet ]]
  then
  prepare_planet_arm64
  deploy_docker './docker/planet/arm64-Dockerfile' $PLANET_ARM64 $PLANET_ARM64_LATEST
  deploy_tag $PLANET_ARM64 $PLANET_ARM64_VERSIONED
fi
