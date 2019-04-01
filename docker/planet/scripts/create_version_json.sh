PLANET_VERSION=$(cat package.json | jq -r .version)
LATEST_APK_VERSION="v0.3.14"
LATEST_APK_VER_CODE="314"
MIN_APK_VERSION="v0.3.14"
MIN_APK_VER_CODE="314"
APK_PATH="https://github.com/open-learning-exchange/myplanet/releases/download/v0.3.14/myPlanet.apk"

echo '{"appname":"planet","planetVersion":"'$PLANET_VERSION'","latestapk":"'$LATEST_APK_VERSION'","latestapkcode":'$LATEST_APK_VER_CODE',"minapk":"'$MIN_APK_VERSION'","minapkcode":'$MIN_APK_VER_CODE',"apkpath":"'$APK_PATH'"}' > dist/versions
