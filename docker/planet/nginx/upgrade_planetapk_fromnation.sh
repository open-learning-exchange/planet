#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

apkName="myPlanet.apk"
localApkName="myPlanet.apk"
sha256File="$apkName.sha256"

nationUrl="$(curl -s http://couchdb:5984/configurations/$(curl http://couchdb:5984/configurations/_all_docs -s | jq .rows[0].id -r) | jq .parentDomain -r | sed -e 's|^[^/]*//||' -e 's|/.*$||')"
downloadUrl="$nationUrl/fs/$apkName"

download_apk(){
  echo "Downloading new version"
  echo "$(curl -# "$downloadUrl" -o "$apkName" -L)"
}

cd fs
curl -s "$nationUrl/fs/$sha256File" -o "$sha256File" -L
if [ -f "$apkName" ] && [ -f "$sha256File" ]; then
  if sha256sum "$apkName" | sha256sum -c "$sha256File" 2>&1 | grep OK; then
    echo "Version upto date"
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
