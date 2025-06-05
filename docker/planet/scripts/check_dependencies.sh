#!/usr/bin/env sh

PREVIOUS_REF="origin/master:package.json"

if [ $(git branch --show-current) = "master" ] || [ "$IS_RELEASE" = "true" ]; then
  PREVIOUS_REF="origin/master~1:package.json"
fi

DEPENDENCIES=$(jq -r '.dependencies | keys[] as $key | "\($key) \(.[$key])"' package.json);
OLD_DEPENDENCIES=$(git show $PREVIOUS_REF | jq -r '.dependencies');

DEV_DEPENDENCIES=$(jq -r '.devDependencies | keys[] as $key | "\($key) \(.[$key])"' package.json);
OLD_DEV_DEPENDENCIES=$(git show $PREVIOUS_REF | jq -r '.devDependencies');

check_dependencies() {
  echo "$1" | while read -r line; do
    index=0;
    for value in $line; do
      if [ $index -eq 0 ]; then
        package=$value;
      fi
      if [ $index -eq 1 ]; then
        version=$value;
      fi
      index=$(expr $index + 1);
    done
    old_version=$(echo "$2" | jq --arg package "$package" -r '.[$package]');
    if [ "$version" != "$old_version" ]; then
      echo 1;
      break;
    fi
  done
}

output=$(check_dependencies "$DEPENDENCIES" "$OLD_DEPENDENCIES");

if [ -z "$output" ]; then
  output=$(check_dependencies "$DEV_DEPENDENCIES" "$OLD_DEV_DEPENDENCIES");
fi

echo $output;
