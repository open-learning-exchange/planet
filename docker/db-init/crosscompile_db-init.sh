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
  # treehouses/node-tags:arm ships with a deprecated NodeSource apt repo that
  # currently fails signature validation on xenial, so drop it explicitly.
  rm -f /etc/apt/sources.list.d/nodesource.list
  rm -f /etc/apt/sources.list.d/nodesource.list.save
  apt-get update -qq
  apt-get install -y nodejs npm build-essential ${PACKAGES}
  npm install "--arch=${TRIPLE}" -g add-cors-to-couchdb
else
  echo "Error: No action Specified"
fi
