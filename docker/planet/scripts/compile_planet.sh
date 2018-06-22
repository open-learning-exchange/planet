#!/usr/bin/env bash
# shellcheck disable=SC1091

source build_planet.sh

if [[ -z "${I18N}" ]]; then
  I18N="single"
fi

echo "Build the angular app in production mode stage"
if [[ "${I18N}" == "multi" ]]; then
 build_multi
else
 build_single
fi

