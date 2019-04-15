#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

repoUrl="https://github.com/open-learning-exchange/myplanet"
apkName="myPlanet.apk"
sha256File="$apkName.sha256"

tag=$(cat versions | jq -r .latestapk)
echo "Last release version: $tag"
downloadUrl="$repoUrl/releases/download/$tag/$apkName"

download_apk(){
  echo "Downloading new version"
  echo "$(curl -# "$downloadUrl" -o "$apkName" -L)"
}

cd fs
curl -s "$repoUrl/releases/download/$tag/$sha256File" -o "$sha256File" -L
echo "Getting SHA256 file"
if [ -f "$apkName" ] && [ -f "$sha256File" ]; then
  if sha256sum "$apkName" | sha256sum -c "$sha256File" 2>&1 | grep OK; then
    echo "Version up to date"
  else
    mv "$apkName" "$apkName.tmp"
    download_apk
    echo "Verifying apk"
    if sha256sum "$apkName" | sha256sum -c "$sha256File" 2>&1 | grep OK; then
      echo "Download successful"
      rm -f "$apkName.tmp"
    else
      echo "Download error"
      mv "$apkName.tmp" "$apkName"
    fi
  fi
else
  download_apk
  echo "Verifying apk"
  if sha256sum "$apkName" | sha256sum -c "$sha256File" 2>&1 | grep OK; then
    echo "Download successful"
    rm -f "$apkName.tmp"
  else
    echo "Download error"
  fi
fi
