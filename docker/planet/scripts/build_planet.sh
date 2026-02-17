#!/usr/bin/env sh

build_single(){
  LANG=$1

  npm run ng-high-memory -- build --configuration production --aot --localize=true
}
