#!/bin/bash

#CORS
git clone https://github.com/pouchdb/add-cors-to-couchdb.git
cd add-cors-to-couchdb
npm install
node bin.js http://couchdb:5984
cd -

#MIGRATOR
curl -X PUT http://couchdb:5984/_users
curl -X PUT http://couchdb:5984/_replicator
curl -X PUT http://couchdb:5984/_global_changes
curl -X PUT http://couchdb:5984/meetups

