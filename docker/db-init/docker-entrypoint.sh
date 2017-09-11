#!/bin/bash

#CORS DOWNLOAD
git clone https://github.com/pouchdb/add-cors-to-couchdb.git

#WAIT_TIME
echo  "Waiting for couchdb to start"
WAIT_TIME=0
until curl couchdb:5984 || [ $WAIT_TIME -eq 180 ]; do
    echo "..."
    sleep 5
    WAIT_TIME=$(expr $WAIT_TIME + 5)
done

#CORS SETUP
cd add-cors-to-couchdb
npm install
node bin.js http://couchdb:5984
cd -

#MIGRATOR
curl -X PUT http://couchdb:5984/_users
curl -X PUT http://couchdb:5984/_replicator
curl -X PUT http://couchdb:5984/_global_changes
curl -X PUT http://couchdb:5984/meetups

