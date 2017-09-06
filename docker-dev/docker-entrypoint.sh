#!/bin/bash
# Add CORS to CouchDB so app has access to databases
git clone https://github.com/pouchdb/add-cors-to-couchdb.git
cd add-cors-to-couchdb
npm install
node bin.js http://couchdb:5984
# End add CORS to CouchDB

# Add initial Couch databases here
curl -X PUT http://couchdb:5984/_users
curl -X PUT http://couchdb:5984/_replicator
curl -X PUT http://couchdb:5984/_global_changes
curl -X PUT http://couchdb:5984/meetups
# End Couch database addition

ng serve
