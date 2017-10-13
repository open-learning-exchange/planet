#!/bin/bash

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

# Add or update design docs
COURSE_VALIDATOR=$(curl $COUCHURL/courses/_design/course-validators)
if [[ $COURSE_VALIDATOR == *rev* ]]; then
  COURSE_VALIDATOR_REV=$(echo $COURSE_VALIDATOR | python -c "import sys, json; print json.load(sys.stdin)['_rev']")
  curl -X PUT $COUCHURL/courses/_design/course-validators?rev=$COURSE_VALIDATOR_REV -d @./design/courses/course-validators.json
else
  curl -X PUT $COUCHURL/courses/_design/course-validators -d @./design/courses/course-validators.json
fi
