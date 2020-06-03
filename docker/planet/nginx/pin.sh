#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

#echo $KEY
YML_PATH=credentials/credentials.yml
USER=$(cat credentials/credentials.yml | sed -n -e 's/.*COUCHDB_USER=*//p')
PASS=$(cat credentials/credentials.yml | sed -n -e 's/.*COUCHDB_PASS=*//p')

PIN="$(curl -X GET http://"$USER":"$PASS"@couchdb:5984/_node/nonode@nohost/_conf

echo $PIN
