#!/bin/sh

if [ -z $COUCHDB_HOST ]; then
  echo '$COUCHDB_HOST is not set, defaulting to' 'http://couchdb:5984'
  export $COUCHDB_HOST='http://couchdb:5984'
fi

#WAIT_TIME
echo  "Waiting for couchdb to start"
WAIT_TIME=0
until curl $COUCHDB_HOST || [ $WAIT_TIME -eq 180 ]; do
    echo "..."
    sleep 5
    WAIT_TIME=$(expr $WAIT_TIME + 5)
done

#CORS SETUP
add-cors-to-couchdb $COUCHDB_HOST

#MIGRATOR
if [[ -z "${COUCHDB_USER}" ]]; then
    ./couchdb-setup.sh -p 5984 -h couchdb
  else
    if [[ -z "${COUCHDB_PASS}" ]]; then
      echo "The COUCHDB_PASS is not set. Exiting..."
    else
      ./couchdb-setup.sh -p 5984 -h couchdb -u $COUCHDB_USER -w $COUCHDB_PASS
    fi
fi
