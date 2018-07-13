#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

PULL_IMAGES="treehouses/planet:db-init"
PULL_IMAGES="${PULL_IMAGES} treehouses/planet:latest"
PULL_IMAGES="${PULL_IMAGES} treehouses/couchdb:2.1.1"

for image in ${PULL_IMAGES}; do
    curl --unix-socket /var/run/docker.sock -X POST "http://localhost/images/create?fromImage=$image"
done
