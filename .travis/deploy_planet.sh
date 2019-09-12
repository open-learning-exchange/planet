#!/bin/bash
set -e
source ./.travis/travis_utils.sh
prepare_ci
prepare_planet_test
if [ ! -z "$gtag" ] || [ ! -z "$TRAVIS_TAG" ]; then
  LANGUAGES=('eng' 'ara' 'spa' 'fra' 'nep' 'som')
else
  LANGUAGES=('eng')
fi
compose_languages "${LANGUAGES[@]}"

deploy_docker './docker/planet/Dockerfile' $PLANET_TEST $PLANET_TEST_LATEST
