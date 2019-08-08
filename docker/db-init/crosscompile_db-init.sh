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

echo "Building db-init for ${ARCH}"

if [[ "${ACT}" == "install" ]]; then
  apt-get update -qq
  apt-get install -y curl gnupg
  curl -sL https://deb.nodesource.com/setup_10.x | bash -
  apt-get install -y nodejs build-essential ${PACKAGES}
  npm install "--arch=${TRIPLE}" -g add-cors-to-couchdb
else
  echo "Error: No action Specified"
fi
