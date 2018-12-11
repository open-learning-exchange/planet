PLANET_VERSION=$(cat package.json | jq -r .version)
LATEST_APK_VERSION="v0.2.27"
MIN_APK_VERSION="v0.2.27"
APK_PATH="https://github.com/open-learning-exchange/myplanet/releases/download/v0.2.27/myPlanet.apk"

echo '{"appname":"planet","minapk":"'$MIN_APK_VERSION'","latestapk":"'$LATEST_APK_VERSION'","planetVersion":"'$PLANET_VERSION'","apkpath":"'$APK_PATH'"}' > dist/versions
