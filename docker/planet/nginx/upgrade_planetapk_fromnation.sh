#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

apkName="myPlanet.apk"
localApkName="myPlanet.apk"
sha256File="$apkName.sha256"

nationUrl="$(curl -s http://couchdb:5984/configurations/$(curl http://couchdb:5984/configurations/_all_docs -s | jq .rows[0].id -r) | jq .parentDomain -r | sed -e 's|^[^/]*//||' -e 's|/.*$||')"
downloadUrl="$nationUrl/fs/$apkName"

resolve_apk_version() {
  metadataVersion="$(curl -fsSL "$nationUrl/fs/apkversion" 2>/dev/null | tr -d '\r' | head -n 1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ -n "$metadataVersion" ] && [ "$metadataVersion" != "null" ]; then
    echo "$metadataVersion"
    return 0
  fi

  headerVersion="$(curl -fsSI "$downloadUrl" 2>/dev/null | awk '
    BEGIN{IGNORECASE=1}
    /^x-apk-version:/ {
      sub(/^[^:]*:[[:space:]]*/, "")
      gsub(/\r/, "")
      print
      exit
    }
  ')"

  if [ -n "$headerVersion" ]; then
    echo "$headerVersion"
  fi
}

write_apk_version() {
  resolvedVersion="$(resolve_apk_version)"

  if [ -n "$resolvedVersion" ]; then
    echo "$resolvedVersion" > /usr/share/nginx/html/fs/apkversion
    echo "Resolved version: $resolvedVersion"
  else
    echo "Unable to resolve apk version metadata; keeping existing /usr/share/nginx/html/fs/apkversion"
  fi
}

download_apk(){
  echo "Downloading new version"
  echo "$(curl -# "$downloadUrl" -o "$apkName" -L)"
}

cd fs
curl -s "$nationUrl/fs/$sha256File" -o "$sha256File" -L
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
      write_apk_version
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
    write_apk_version
  else
    echo "Download error"
  fi
fi
