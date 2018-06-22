#!/usr/bin/env sh
# shellcheck disable=SC1091

. build_planet.sh

if [ -z "${I18N}" ]; then
  I18N="single"
fi

echo "Build the angular app in production mode stage"
if [ "${I18N}" = "multi" ]; then
 build_multi
else
 build_single
fi

