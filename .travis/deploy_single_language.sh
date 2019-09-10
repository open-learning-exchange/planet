#!/bin/bash
# $1: language 3 letter code
# $2: language 2 letter code
set -e
source ./.travis/travis_utils.sh
prepare_ci
prepare_planet_test
deploy_docker './docker/planet/builder-Dockerfile' $PLANET_TEST $PLANET_TEST_LATEST $1 $2
