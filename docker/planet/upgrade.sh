#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""
curl --unix-socket /var/run/docker.sock -X POST "http://localhost/images/create?fromImage=treehouses/planet:latest"