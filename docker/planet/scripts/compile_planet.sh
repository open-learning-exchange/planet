#!/usr/bin/env sh

echo "Build the angular app in production mode stage"
npm run ng-high-memory -- build --configuration production --aot --localize=true
