#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

repoUrl="https://github.com/open-learning-exchange/myplanet"
repoApkName="myPlanet.apk"
sha256File="$repoApkName.sha256"
localApkName="/usr/share/nginx/html/fs/myPlanet.apk"

latestReleaseUrl="$repoUrl/releases/latest"
releaseUrl=$(curl -L "$latestReleaseUrl" -w "%{url_effective}" -o /dev/null -s)
tag=$(echo "$releaseUrl" | sed -r 's/.*\/(.*)/\1/')

downloadUrl="$repoUrl/releases/download/$tag/$repoApkName"

if [ -f "$localApkName" ] && echo "$(curl -s "$repoUrl/releases/download/$tag/$sha256File" | head -c64) $localApkName" | sha256sum -s -c -; then
  echo "The file hasn't changed."
else
  echo "New file found."
  curl -s "$downloadUrl" -o "$localApkName" -L
fi
