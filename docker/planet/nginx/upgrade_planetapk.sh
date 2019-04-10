#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

repoUrl="https://github.com/open-learning-exchange/myplanet"
repoApkName="myPlanet-release.apk"
localApkName="myPlanet.apk"
sha256File="myPlanet.apk.sha256"
localShaFile="$repoApkName.sha256"

latestReleaseUrl="$repoUrl/releases/latest"
releaseUrl=$(curl -L "$latestReleaseUrl" -w "%{url_effective}" -o /dev/null -s)
tag=$(echo "$releaseUrl" | sed -r 's/.*\/(.*)/\1/')
echo "Last release version: $tag"
downloadUrl="$repoUrl/releases/download/$tag/$repoApkName"

cd fs
curl -s "$repoUrl/releases/download/$tag/$sha256File" -o "$localShaFile" -L
echo "Getting SHA256 file"
if [ -f "$repoApkName" ] && [ -f "$localShaFile" ] && sha256sum "$repoApkName" | sha256sum -c "$localShaFile" 2>&1 | grep OK; then
  echo "The file hasn't changed."
else
  echo "Downloading new version"
  echo "$(curl -# "$downloadUrl" -o "$repoApkName" -L)"
  cp "$repoApkName" "$localApkName"
fi
