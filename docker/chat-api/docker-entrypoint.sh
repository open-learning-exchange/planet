#!/bin/bash

if [ -z $COUCHDB_HOST ]; then
  echo '$COUCHDB_HOST is not set, defaulting to' 'http://couchdb:5984'
  export COUCHDB_HOST='http://couchdb:5984'
fi

export COUCHDB_DOMAIN=$(echo $COUCHDB_HOST | sed -E -e 's_.*://([^/@]*@)?([^/:]+).*_\2_')
export COUCHDB_PORT=$(echo $COUCHDB_HOST | sed -e 's,^.*:,:,g' -e 's,.*:\([0-9]*\).*,\1,g' -e 's,[^0-9],,g')

#WAIT_TIME
echo  "Waiting for couchdb to start"
WAIT_TIME=0
until curl $COUCHDB_HOST || [ $WAIT_TIME -eq 600 ]; do
    echo "..."
    sleep 5
    WAIT_TIME=$(expr $WAIT_TIME + 5)
done

#CORS SETUP
add-cors-to-couchdb $COUCHDB_HOST
if [[ -z $INSTALL ]]; then
  INSTALLFLAG=""
else
  INSTALLFLAG=-i
fi

#MIGRATOR
if [[ -z "${COUCHDB_USER}" ]]; then
    ./couchdb-setup.sh -p $COUCHDB_PORT -h $COUCHDB_DOMAIN $INSTALLFLAG
  else
    if [[ -z "${COUCHDB_PASS}" ]]; then
      echo "The COUCHDB_PASS is not set. Exiting..."
    else
      ./couchdb-setup.sh -p $COUCHDB_PORT -h $COUCHDB_DOMAIN -u $COUCHDB_USER -w $COUCHDB_PASS $INSTALLFLAG
    fi
fi
