PLANET_VERSION=$(cat package.json | jq -r .version)
LATEST_APK_VERSION="v0.2.29"
MIN_APK_VERSION="v0.2.27"
APK_PATH="https://github.com/open-learning-exchange/myplanet/releases/download/v0.2.29/myPlanet.apk"
LATEST_APK_VER_CODE="229"
MIN_APK_VER_CODE="227"

echo '{"appname":"planet","minapk":"'$MIN_APK_VERSION'","minapkcode":'$MIN_APK_VER_CODE',"latestapk":"'$LATEST_APK_VERSION'","latestapkcode":'$LATEST_APK_VER_CODE',"planetVersion":"'$PLANET_VERSION'","apkpath":"'$APK_PATH'"}' > dist/versions
