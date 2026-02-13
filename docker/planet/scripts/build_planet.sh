#!/usr/bin/env sh

build_single(){
  npm run ng-high-memory -- build --configuration production --aot --localize=true
}
