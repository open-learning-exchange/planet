#!/bin/bash

#WAIT_TIME
echo  "Waiting for couchdb to start"
WAIT_TIME=0
until curl couchdb:5984 || [ $WAIT_TIME -eq 180 ]; do
    echo "..."
    sleep 5
    WAIT_TIME=$(expr $WAIT_TIME + 5)
done

#CORS SETUP
add-cors-to-couchdb http://couchdb:5984

#MIGRATOR
./couchdb-setup.sh -p 5984 -h couchdb
