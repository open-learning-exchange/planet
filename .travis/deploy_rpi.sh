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
    echo "usage: deploy_rpi.sh -b=<branch-name>|--branch=<branch-name>"
    echo "usage: deploy_rpi.sh -c=<commit-sha>|--commit=<commit-sha>"
    echo "usage: deploy_rpi.sh -p=<pull-request-number>|--pull=<pull-request-number>"
    echo "usage: deploy_rpi.sh -u=<docker-user-name>|--duser=<docker-user-name>"
    echo "usage: deploy_rpi.sh -k=<docker-password>|--dpass=<docker-password>"
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
  prepare_db_init_rpi
  deploy_docker './docker/db-init/rpi-Dockerfile' $DOCKER_DB_INIT_RPI $DOCKER_DB_INIT_RPI_LATEST
  deploy_tag $DOCKER_DB_INIT_RPI $DOCKER_DB_INIT_RPI_VERSIONED
fi

if [[ $image = planet ]]
  then
  prepare_planet_rpi
  deploy_docker './docker/planet/rpi-Dockerfile' $PLANET_RPI $PLANET_RPI_LATEST '--platform=linux/arm'
  deploy_tag $PLANET_RPI $PLANET_RPI_VERSIONED
fi
