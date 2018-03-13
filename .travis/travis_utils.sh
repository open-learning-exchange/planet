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
    docker login -u $DOCKER_USER -p $DOCKER_PASS
}

prepare_package(){
  DOCKER_ORG=treehouses
  DOCKER_REPO=planet
  VERSION=$(cat package.json | grep version | awk '{print$2}' | awk '{print substr($0, 2, length($0) - 3)}')
  BRANCH=$TRAVIS_BRANCH
  COMMIT=${TRAVIS_COMMIT::8}
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
  export PLANET=$DOCKER_ORG/$DOCKER_REPO:$VERSION-$BRANCH-$COMMIT
  export PLANET_LATEST=$DOCKER_ORG/$DOCKER_REPO:latest
}

prepare_db_init(){
  build_message prepare planet docker...
  export DOCKER_DB_INIT=$DOCKER_ORG/$DOCKER_REPO:db-init-$VERSION-$BRANCH-$COMMIT
  export DOCKER_DB_INIT_LATEST=$DOCKER_ORG/$DOCKER_REPO:db-init
}

package_docker(){
  # $1: directory
  # $2: tag
  # $3: tag latest
  build_message processing $2
  docker build -f $1 -t $2 .
  if [ "$BRANCH" = "master" ]
	then
		tag_a_docker $2 $3
	fi
}

push_docker(){
  # $1: tag
  # $2: tag latest
  push_a_docker $1
	if [ "$BRANCH" = "master" ]
	then
	  push_a_docker $2
	fi
}

delete_docker(){
  # $1: tag
  # $2: tag latest
	docker rmi -f $1
	if [ "$BRANCH" = "master" ]
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
	docker logout
}
