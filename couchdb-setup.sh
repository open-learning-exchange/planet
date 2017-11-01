#!/bin/bash

# Function for upsert of design docs
upsert_design() {
  DB=$1
  DOC_NAME=$2
  DOC_LOC=$3
  DOC=$(curl $COUCHURL/$DB/_design/$DOC_NAME)
  # If DOC includes a rev then it exists so we need to update
  # Otherwise we simply insert
  if [[ $DOC == *rev* ]]; then
    DOC_REV=$(echo $DOC | python -c "import sys, json; print json.load(sys.stdin)['_rev']")
    curl -X PUT $COUCHURL/$DB/_design/$DOC_NAME?rev=$DOC_REV -d @$DOC_LOC
  else
    curl -X PUT $COUCHURL/$DB/_design/$DOC_NAME -d @$DOC_LOC
  fi
}

# Options are -u for username -w for passWord and -p for port number
while getopts "u:w:p:" option; do
  case $option in
    u) COUCHUSER=${OPTARG};;
    w) COUCHPASSWORD=${OPTARG};;
    p) PORT=${OPTARG};;
  esac
done

# Default port for CouchDB accessed from host machine is 2200
PORT=${PORT:-2200}
if [ -z "$COUCHUSER" ]
then
  COUCHURL=http://127.0.0.1:$PORT
else
  COUCHURL=http://$COUCHUSER:$COUCHPASSWORD@127.0.0.1:$PORT
fi

# Add CouchDB standard databases
curl -X PUT $COUCHURL/_users
curl -X PUT $COUCHURL/_replicator
curl -X PUT $COUCHURL/_global_changes

# Add planet app databases
curl -X PUT $COUCHURL/meetups
curl -X PUT $COUCHURL/resources
curl -X PUT $COUCHURL/courses
curl -X PUT $COUCHURL/nations
curl -X PUT $COUCHURL/communityregistrationrequests

# Add or update design docs
upsert_design courses course-validators ./design/courses/course-validators.json

# Adding nation dummy data
curl -H 'Content-Type: application/json' -X POST $COUCHURL/nations/_bulk_docs  -d @design/nations/nationsDummyData.json
# Adding communityregistrationrequests dummy data/objects
curl -H 'Content-Type: application/json' -X POST $COUCHURL/communityregistrationrequests/_bulk_docs -d @design/community/communitymockdata.json
