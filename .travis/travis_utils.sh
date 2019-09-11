#!/bin/bash

build_message(){
    # $1 = build message
    echo
    echo =========BUILD MESSAGE=========
    echo "$@"
    echo ===============================
    echo
}

login_docker(){
  echo "$DOCKER_PASS" | docker login -u $DOCKER_USER --password-stdin
}

prepare_ci(){
  DOCKER_ORG=treehouses
  DOCKER_REPO=planet-tags
  DOCKER_REPO_TEST=planet-test
  VERSION=$(jq '.version' package.json | sed -e 's/^"//' -e 's/"$//')
  BRANCH=$TRAVIS_BRANCH
  COMMIT=${TRAVIS_COMMIT::8}
  REMOTE_MASTER_HASH=$(git ls-remote https://github.com/open-learning-exchange/planet.git | grep refs/heads/master | cut -f 1)
  LOCAL_HASH=$(git log -n 1 --pretty=format:"%H")
  export NODE_OPTIONS=--max_old_space_size=4096
}

push_a_docker(){
  build_message pushing $1
    docker push $1
    build_message done pushing $1
}

tag_a_docker(){
  build_message processing $2
    docker tag $1 $2
    build_message done processing $2
}

prepare_planet(){
  build_message prepare planet docker...
  PLANET=$DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT
  PLANET_VERSIONED=$DOCKER_ORG/$DOCKER_REPO:$VERSION
  PLANET_LATEST=$DOCKER_ORG/$DOCKER_REPO:latest
}

prepare_db_init(){
  build_message prepare db-init docker...
  DOCKER_DB_INIT=$DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT
  DOCKER_DB_INIT_VERSIONED=$DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION
  DOCKER_DB_INIT_LATEST=$DOCKER_ORG/$DOCKER_REPO:db-init
}

prepare_planet_rpi(){
  build_message prepare planet docker...
  PLANET_RPI=$DOCKER_ORG/$DOCKER_REPO:rpi-$VERSION-$BRANCH-$COMMIT
  PLANET_RPI_VERSIONED=$DOCKER_ORG/$DOCKER_REPO:rpi-$VERSION
  PLANET_RPI_LATEST=$DOCKER_ORG/$DOCKER_REPO:rpi-latest
  docker create --name reuse-artifact $DOCKER_ORG/$DOCKER_REPO_TEST:$VERSION-$BRANCH-$COMMIT
  mkdir -p ./ng-app/dist
  docker export reuse-artifact > reuse-artifact.tar
  # this used to had verbose mode,
  # which was been removed due to problems when building travis images.
  # we found the solution here
  # https://stackoverflow.com/questions/37540792/jenkins-script-tar-write-error
  tar -xf reuse-artifact.tar -C ./ng-app/dist
}

prepare_db_init_rpi(){
  build_message prepare db-init docker...
  DOCKER_DB_INIT_RPI=$DOCKER_ORG/$DOCKER_REPO:rpi-db-init-$VERSION-$BRANCH-$COMMIT
  DOCKER_DB_INIT_RPI_VERSIONED=$DOCKER_ORG/$DOCKER_REPO:rpi-db-init-$VERSION
  DOCKER_DB_INIT_RPI_LATEST=$DOCKER_ORG/$DOCKER_REPO:rpi-db-init
}

prepare_planet_test(){
  build_message prepare planet test docker...
  PLANET_TEST=$DOCKER_ORG/$DOCKER_REPO_TEST:$VERSION-$BRANCH-$COMMIT
  PLANET_TEST_LATEST=$DOCKER_ORG/$DOCKER_REPO_TEST:latest
}

prepare_db_init_test(){
  build_message prepare db-init test docker...
  DOCKER_DB_INIT_TEST=$DOCKER_ORG/$DOCKER_REPO_TEST:db-init-$VERSION-$BRANCH-$COMMIT
  DOCKER_DB_INIT_TEST_LATEST=$DOCKER_ORG/$DOCKER_REPO_TEST:db-init
}

prepare_multiarch_manifest_tool(){
  build_message Prepare Manifest tool
  sudo wget -O /usr/local/bin/manifest_tool https://github.com/estesp/manifest-tool/releases/download/v0.7.0/manifest-tool-linux-amd64
  sudo chmod +x /usr/local/bin/manifest_tool
  mkdir -p /tmp/MA_manifests
}

prepare_yq(){
  build_message Prepare yq
  sudo wget -O /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/1.14.1/yq_linux_amd64
  sudo chmod +x /usr/local/bin/yq
}

prepare_everything(){
  prepare_ci
  prepare_planet
  prepare_db_init
  prepare_planet_test
  prepare_db_init_test
  prepare_planet_rpi
  prepare_db_init_rpi
}

package_docker(){
  # $1: directory
  # $2: tag
  # $3: tag latest
  build_message processing $2
  if [ ! -z "$gtag" ] || [ ! -z "$TRAVIS_TAG" ]; then
    docker build -f $1 -t $2 --build-arg LANGUAGE_MODE=multi .
  else
    docker build -f $1 -t $2 --build-arg LANGUAGE_MODE=single  .
  fi
  if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
      tag_a_docker $2 $3
  fi
}

push_docker(){
  # $1: tag
  # $2: tag latest
  push_a_docker $1
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
      push_a_docker $2
    fi
}

tag_docker(){
  # $1: tag old
  # $2: tag new
  tag_a_docker $1 $2
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
      tag_a_docker $1 $3
    fi
}

deploy_tag(){
  if [[ ! -z $gtag ]] || [[ ! -z $TRAVIS_TAG  ]]
  then
    tag_a_docker $1 $2
    push_a_docker $2
  fi
}

delete_docker(){
  # $1: tag
  # $2: tag latest
    docker rmi -f $1
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
        docker rmi -f $2
  fi
}

deploy_docker(){
  # $1: directory
  # $2: tag
  # $3: tag latest
    login_docker
    package_docker $1 $2 $3
    push_docker $2 $3
}

render_compose_travis(){
  COMPOSE_LOC=$(pwd)/.travis/planet-travis.yml
  sed -i -e "s#\${DOCKER_DB_INIT}#$DOCKER_DB_INIT_TEST#g" "$COMPOSE_LOC"
  sed -i -e "s#\${PLANET}#$PLANET_TEST#g" "$COMPOSE_LOC"
  cat "$COMPOSE_LOC"
}

create_multiarch_manifest_planet(){
    build_message Creating Planet Multiarch Manifests
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
        build_message Creating Planet Multiarch Manifest for Latest
        # $1: latest arm
        # $2: latest amd64
        yq n image treehouses/planet:latest | \
        yq w - manifests[0].image $1 | \
        yq w - manifests[0].platform.architecture arm | \
        yq w - manifests[0].platform.os linux | \
        yq w - manifests[1].image $2 | \
        yq w - manifests[1].platform.architecture amd64 | \
        yq w - manifests[1].platform.os linux | \
        tee /tmp/MA_manifests/MA_planet_latest.yaml
    else
        build_message Branch is Not master so no need to create Multiarch manifests for planet.
    fi

    #Building for versioned
    if [[ ! -z $gtag ]] || [[ ! -z $TRAVIS_TAG  ]]
    then
        if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
        then
            build_message Creating Planet Multiarch Manifest for Versioned.
            # $3: versioned arm
            # $4: versioned amd64
            yq n image treehouses/planet:$VERSION | \
            yq w - manifests[0].image $3 | \
            yq w - manifests[0].platform.architecture arm | \
            yq w - manifests[0].platform.os linux | \
            yq w - manifests[1].image $4 | \
            yq w - manifests[1].platform.architecture amd64 | \
            yq w - manifests[1].platform.os linux | \
            tee /tmp/MA_manifests/MA_planet_versioned.yaml
        else
            build_message Local Commit is not latest. Hence Not creating Versioned Multiarch manifests for planet.
        fi
    else
        build_message No tag present so no need to create Versioned Multiarch manifests for planet.
    fi
}

create_multiarch_manifest_dbinit(){
    build_message Creating db init Multiarch Manifests
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
        build_message Creating Multiarch Manifest for db-init
        # $1: db-init arm
        # $2: db-init amd64
        yq n image treehouses/planet:db-init | \
        yq w - manifests[0].image $1 | \
        yq w - manifests[0].platform.architecture arm | \
        yq w - manifests[0].platform.os linux | \
        yq w - manifests[1].image $2 | \
        yq w - manifests[1].platform.architecture amd64 | \
        yq w - manifests[1].platform.os linux | \
        tee /tmp/MA_manifests/MA_db_init.yaml
     else
        build_message Branch is Not master so no need to create Multiarch manifests for db-init.
     fi

     #Building for versioned
     if [[ ! -z $gtag ]] || [[ ! -z $TRAVIS_TAG  ]]
     then
        if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
        then
            build_message Creating Multiarch Manifest for db-init Versioned
            # $3: db-init versioned arm
            # $4: db-init versioned amd64
            yq n image treehouses/planet:db-init-$VERSION | \
            yq w - manifests[0].image $3 | \
            yq w - manifests[0].platform.architecture arm | \
            yq w - manifests[0].platform.os linux | \
            yq w - manifests[1].image $4 | \
            yq w - manifests[1].platform.architecture amd64 | \
            yq w - manifests[1].platform.os linux | \
            tee /tmp/MA_manifests/MA_db_init_versioned.yaml
        else
            build_message Local Commit is not latest. Hence Not creating Versioned Multiarch manifests for db-init.
        fi
      else
        build_message No tag present so no need to create Versioned Multiarch manifests for db-init.
     fi
}

push_multiarch_manifests(){
    build_message Pushing Multiarch Manifests to cloud
    if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
    then
        manifest_tool push from-spec /tmp/MA_manifests/MA_planet_latest.yaml
        manifest_tool push from-spec /tmp/MA_manifests/MA_db_init.yaml
        build_message Successfully Pushed Multiarch Manifests to cloud
    else
         build_message Branch is Not master so no need to Push Multiarch Manifests to cloud
    fi
    #Building for versioned
    if [[ ! -z $gtag ]] || [[ ! -z $TRAVIS_TAG  ]]
    then
        if [ "$REMOTE_MASTER_HASH" = "$LOCAL_HASH" ]
        then
            manifest_tool push from-spec /tmp/MA_manifests/MA_planet_versioned.yaml
            manifest_tool push from-spec /tmp/MA_manifests/MA_db_init_versioned.yaml
            build_message Successfully Pushed Versioned Multiarch Manifests to cloud
        else
            build_message Local Commit is not latest. Hence Not pushing Versioned Multiarch Manifests to cloud
        fi
    else
         build_message No tag present so no need to Push Versioned Multiarch Manifests to cloud
    fi
}
