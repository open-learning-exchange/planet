#!/bin/bash
set -e
source ./.travis/travis_utils.sh
prepare_ci
prepare_planet_test
LANGUAGES=('eng' 'ara' 'spa' 'fra' 'nep' 'som')
compose_languages "${LANGUAGES[@]}"

deploy_docker './docker/planet/Dockerfile' $PLANET_TEST $PLANET_TEST_LATEST
