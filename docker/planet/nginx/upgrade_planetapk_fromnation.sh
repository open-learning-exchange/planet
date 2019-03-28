#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

nationUrl="$(curl -s http://couchdb:5984/configurations/$(curl http://couchdb:5984/configurations/_all_docs -s | jq .rows[0].id -r) | jq .parentDomain -r | rev | cut -c 3- | rev)fs"
apkName="myPlanet.apk"
sha256File="$apkName.sha256"
localApkName="/usr/share/nginx/html/fs/myPlanet.apk"

if [ -f "$localApkName" ] && echo "$(curl -s "$nationUrl/$sha256File" | head -c64)  $localApkName" | sha256sum -s -c -; then
  echo "The file hasn't changed."
else
  echo "New file found."
  curl -s "$nationUrl/$apkName" -o "$localApkName" -L
fi