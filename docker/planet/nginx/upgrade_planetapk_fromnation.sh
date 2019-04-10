#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

repoApkName="myPlanet-release.apk"
localApkName="myPlanet.apk"
sha256File="myPlanet.apk.sha256"
localShaFile="$repoApkName.sha256"

nationUrl="$(curl -s http://couchdb:5984/configurations/$(curl http://couchdb:5984/configurations/_all_docs -s | jq .rows[0].id -r) | jq .parentDomain -r | sed -e 's|^[^/]*//||' -e 's|/.*$||')"
downloadUrl="$nationUrl/fs/$repoApkName"

cd fs
curl -s "$nationUrl/fs/$sha256File" -o "$localShaFile" -L
if [ -f "$repoApkName" ] && [ -f "$localShaFile" ] && sha256sum "$repoApkName" | sha256sum -c "$localShaFile" 2>&1 | grep OK; then
  echo "The file hasn't changed."
else
  echo "Downloading new version"
  echo "$(curl -# "$downloadUrl" -o "$repoApkName" -L)"
  cp "$repoApkName" "$localApkName"
fi
