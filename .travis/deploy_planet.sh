#!/bin/bash
set -e
echo "$(ls /home/travis/build/open-learning-exchange/planet/ng-app/dist/usr/share/nginx/html)"
echo "The current directory is: $(pwd)"
source ./.travis/travis_utils.sh
prepare_ci
prepare_planet_test
LANGUAGES=('eng' 'ara')
compose_languages "${LANGUAGES[@]}"

deploy_docker './docker/planet/Dockerfile' $PLANET_TEST $PLANET_TEST_LATEST
