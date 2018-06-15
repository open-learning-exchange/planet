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
   apt-get update -qq
   apt-get install -y curl gnupg
   curl -sL https://deb.nodesource.com/setup_8.x | bash -
   apt-get install -y nodejs build-essential ${PACKAGES}
   npm install "--arch=${TRIPLE}"
elif [[ "${ACT}" == "build"  ]]; then
   echo "Build the angular app in production mode stage"
   $(npm bin)/ng build --prod --output-path=dist-en
   $(npm bin)/ng build --prod --output-path=dist-ar --aot --i18n-file=src/i18n/messages.ar.xlf --i18n-locale=ar --i18n-format=xlf
   $(npm bin)/ng build --prod --output-path=dist-es --aot --i18n-file=src/i18n/messages.es.xlf --i18n-locale=es --i18n-format=xlf
   $(npm bin)/ng build --prod --output-path=dist-fr --aot --i18n-file=src/i18n/messages.fr.xlf --i18n-locale=fr --i18n-format=xlf
   $(npm bin)/ng build --prod --output-path=dist-ne --aot --i18n-file=src/i18n/messages.ne.xlf --i18n-locale=ne --i18n-format=xlf
else
   echo "Error: No action Specified"
fi
