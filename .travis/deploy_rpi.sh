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

random_generator(){
    awk -v min=10000000 -v max=99999999 'BEGIN{srand(); print int(min+rand()*(max-min+1))}'
}

prepare_var(){
    DOCKER_USER="$duser"
    DOCKER_PASS="$dpass"
    RANDOM_FINGERPRINT=$(random_generator)
    DOCKER_ORG=treehouses
    DOCKER_REPO=planet
    DOCKER_REPO_DEV=planet-dev
    BRANCH=$branch
    COMMIT=${commit::8}
}

prepare_var_post_clone(){
    VERSION=$(cat package.json | grep version | awk '{print$2}' | awk '{print substr($0, 2, length($0) - 3)}')
    FILENAME=$VERSION-$BRANCH-$COMMIT
}

clone_branch(){
    cd /tmp && rm -rf "planet-$RANDOM_FINGERPRINT";
    git clone -b "$branch" https://github.com/ole-vi/planet.git "planet-$RANDOM_FINGERPRINT" && cd "planet-$RANDOM_FINGERPRINT" || exit
    git checkout "$commit"
    TEST_DIRECTORY=/tmp/"planet-$RANDOM_FINGERPRINT"
}

# clone_pr(){
#     TEMPORARY_BRANCH="travis-build"
#     cd /tmp && rm -rf "planet-$RANDOM_FINGERPRINT";
#     git clone https://github.com/ole-vi/planet.git "planet-$commit-$pull" && cd "planet-$commit-$pull" || exit
#     git fetch origin pull/"$pull"/head:"$TEMPORARY_BRANCH"
#     git checkout "$TEMPORARY_BRANCH"
#     TEST_DIRECTORY=/tmp/"planet-$commit-$pull"
# }

remove_temporary_folders(){
	rm -rf "$TEST_DIRECTORY"
}

create_footprint() {
  FOOTPRINT=~/travis-build/$FILENAME
  echo $(date +%Y-%m-%d.%H-%M-%S) $1 >> $FOOTPRINT
}

wait_for_kraken_free() {
    build_message  "Waiting for kraken to not occupied ..."
    WAIT_TIME=0
    MAX_TIME=300
    MAX_DOCKER_RUNNING=2
    until [[ $(docker ps | wc -l) -le $MAX_DOCKER_RUNNING ]] || [[ $WAIT_TIME -eq $MAX_TIME ]]; do
        echo "kraken occupied, please wait for more 5 seconds"
        sleep 5
        WAIT_TIME=$(expr $WAIT_TIME + 5)
    done
    build_message "Waiting done, we will run the build now ..."
}

prepare_var
clone_branch
prepare_var_post_clone
create_footprint start "$commit"
wait_for_kraken_free

source ./.travis/travis_utils.sh

if [[ $image = db-init ]]
  then
  prepare_db_init_rpi
  deploy_docker './docker/db-init/rpi-Dockerfile' $DOCKER_DB_INIT_RPI $DOCKER_DB_INIT_RPI_LATEST
  deploy_tag $DOCKER_DB_INIT_RPI $DOCKER_DB_INIT_RPI_VERSIONED
fi

if [[ $image = planet ]]
  then
  prepare_planet_rpi
  deploy_docker './docker/planet/rpi-Dockerfile' $PLANET_RPI $PLANET_RPI_LATEST
  deploy_tag $PLANET_RPI $PLANET_RPI_VERSIONED
fi

remove_temporary_folders
create_footprint finish "$commit"
