#!/bin/bash

ARCH=$1
ACT=$2

if [[ "${ARCH}" == "armv7" ]]; then
  TRIPLE="arm-linux-gnueabihf"
  GCC="4.8"
elif [[ "${ARCH}" == "armv8" ]]; then
  TRIPLE="aarch64-linux-gnu"
  GCC="4.8"
else
  exit 1
fi

PACKAGES="gcc-${GCC}-${TRIPLE} g++-${GCC}-${TRIPLE}"
export CC="${TRIPLE}-gcc-${GCC}"
export CXX="${TRIPLE}-g++-${GCC}"
export STRIP="${TRIPLE}-strip"
export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

echo "Building Planet for ${ARCH}"

if [[ "${ACT}" == "install"  ]]; then
   echo "Install stage"
   npm install "--arch=${TRIPLE}"
elif [[ "${ACT}" == "build"  ]]; then
   echo "Build the angular app in production mode stage"
   $(npm bin)/ng build "--arch=${TRIPLE}" --prod
else
   echo "Error: No action Specified"
fi
