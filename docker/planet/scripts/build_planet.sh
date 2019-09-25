#!/usr/bin/env sh

build_single(){
  LANG=$1
  LANG2=$2
  if [ -z "${LANG}" ]; then
    npm run ng-high-memory -- build --prod --base-href /eng/ --output-path=dist/eng
  else
    npm run ng-high-memory -- build --prod --base-href /$LANG/ --output-path=dist/$LANG --aot --i18n-file=src/i18n/messages.$LANG.xlf --i18n-locale=$LANG2 --i18n-format=xlf
  fi
}
