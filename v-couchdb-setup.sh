#!/bin/bash
# Options are -u for username -w for passWord and -p for port number
while getopts "u:w:p:h:i" option; do
  case $option in
    u) COUCHUSER=${OPTARG};;
    w) COUCHPASSWORD=${OPTARG};;
    p) PORT=${OPTARG};;
  esac
done
PORT=${PORT:-5984}
vagrant ssh dev -- -t "cd /vagrant;./couchdb-setup.sh -p $PORT -u $COUCHUSER -w $COUCHPASSWORD"
