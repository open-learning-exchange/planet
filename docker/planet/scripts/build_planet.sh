#!/usr/bin/env sh

build_single(){
  LANG=$1
  LANG2=$2
  if [ -z "${LANG}" ]; then
    npm run ng-high-memory -- build --configuration production --aot --localize=true
  else
    npm run ng-high-memory -- build --configuration production --aot --localize=true
  fi
}
