#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

function upgrade {
  curl --unix-socket /var/run/docker.sock -X POST "http://localhost/images/create?fromImage=$1"
}

upgrade "treehouses/planet:db-init"
upgrade "treehouses/planet:latest"
