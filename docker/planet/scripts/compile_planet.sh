#!/usr/bin/env sh

. ./build_planet.sh

echo "Build the angular app in production mode stage"
build_single $LANG $LANG2

