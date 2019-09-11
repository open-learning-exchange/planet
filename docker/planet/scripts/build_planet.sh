#!/usr/bin/env sh

build_multi(){
  {
    "$(npm bin)"/ng-high-memory build --prod --base-href /eng/ --output-path=dist/eng
    "$(npm bin)"/ng-high-memory build --prod --base-href /ara/ --output-path=dist/ara --aot --i18n-file=src/i18n/messages.ara.xlf --i18n-locale=ar --i18n-format=xlf
    "$(npm bin)"/ng-high-memory build --prod --base-href /spa/ --output-path=dist/spa --aot --i18n-file=src/i18n/messages.spa.xlf --i18n-locale=es --i18n-format=xlf
  } &
  {
    "$(npm bin)"/ng-high-memory build --prod --base-href /fra/ --output-path=dist/fra --aot --i18n-file=src/i18n/messages.fra.xlf --i18n-locale=fr --i18n-format=xlf
    "$(npm bin)"/ng-high-memory build --prod --base-href /nep/ --output-path=dist/nep --aot --i18n-file=src/i18n/messages.nep.xlf --i18n-locale=ne --i18n-format=xlf
    "$(npm bin)"/ng-high-memory build --prod --base-href /som/ --output-path=dist/som --aot --i18n-file=src/i18n/messages.som.xlf --i18n-locale=so --i18n-format=xlf
  } &
  wait
}

build_single(){
  "$(npm bin)"/ng-high-memory build --prod --base-href /eng/ --output-path=dist/eng
}
