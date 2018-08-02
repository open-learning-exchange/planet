#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

function upgrade {
  curl --unix-socket /var/run/docker.sock -X POST "http://localhost/images/create?fromImage=$1"
}

function rename {
  curl --unix-socket /var/run/docker.sock -X POST "http://localhost/images/$1/tag?repo=$2"
}

upgrade "treehouses/planet:db-init-$PLANET_VERSION"
upgrade "treehouses/planet:$PLANET_VERSION"

rename "treehouses/planet:$PLANET_VERSION" "treehouses/planet:local"
rename "treehouses/planet:db-init-$PLANET_VERSION" "treehouses/planet:db-init-local"
