#!/usr/bin/env sh

check_packages() {
  npm outdated | while read -r line; do
    index=0;
    for value in $line; do
      if [ "$value" = "Package" ]; then
        break;
      fi
      if [ $index -eq 1 ]; then
        current_version=$value;
      fi
      if [ $index -eq 2 ]; then
        wanted_version=$value;
      fi
      index=$(expr $index + 1);
    done

    if [ "$current_version" != "$wanted_version" ]; then
      echo 1;
      break;
    fi
  done
}

should_install=$(check_packages);

if [ "$should_install" = 1 ]; then
  npm i --silent
fi
