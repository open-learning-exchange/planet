#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

nationUrl="$(curl -s http://couchdb:5984/configurations/$(curl http://couchdb:5984/configurations/_all_docs -s | jq .rows[0].id -r) | jq .parentDomain -r | rev | cut -c 3- | rev)fs"
apkName="myPlanet.apk"
localApkName="/usr/share/nginx/html/fs/myPlanet.apk"
downUrl="$nationUrl/$apkName"

curl -s "$downloadUrl" -o "$localApkName.tmp" -L

if [ -f "$localApkName" ] && echo "$(sha256sum $localApkName | head -c64)  $localApkName.tmp" | sha256sum -s -c -; then
  echo "The file hasn't changed."
  rm -rf "$localApkName.tmp"
else
  echo "New file found."
  mv "$localApkName.tmp" "$localApkName"
fi
