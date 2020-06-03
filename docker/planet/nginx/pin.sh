#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

YML_PATH=credentials/credentials.yml
USER=$(cat credentials/credentials.yml | sed -n -e 's/.*COUCHDB_USER=*//p')
PASS=$(cat credentials/credentials.yml | sed -n -e 's/.*COUCHDB_PASS=*//p')

PIN=$(curl -X GET http://$USER:$PASS@couchdb:5984/_node/nonode@nohost/_config/satellite/pin)

HASH=$(echo -n $PIN | openssl enc -pbkdf2 -aes-256-cbc -a -k $KEY)
echo $HASH
