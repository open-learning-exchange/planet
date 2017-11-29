#!/bin/sh

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

# Function for insert mock data docs
insert_docs() {
  DB=$1
  DOC_LOC=$2
  curl -H 'Content-Type: application/json' -X POST $COUCHURL/$DB/_bulk_docs  -d @$DOC_LOC
}

# Options are -u for username -w for passWord and -p for port number
while getopts "u:w:p:h:" option; do
  case $option in
    u) COUCHUSER=${OPTARG};;
    w) COUCHPASSWORD=${OPTARG};;
    p) PORT=${OPTARG};;
    h) HOST=${OPTARG};;
  esac
done

if [ -z "$HOST" ]
then
  HOST=127.0.0.1
fi

# Default port for CouchDB accessed from host machine is 2200
PORT=${PORT:-2200}
if [ -z "$COUCHUSER" ]
then
  COUCHURL=http://$HOST:$PORT
else
  COUCHURL=http://$COUCHUSER:$COUCHPASSWORD@$HOST:$PORT
fi

# Adding attachment to resource
insert_attachment() {
    python -c "
import urllib, json, sys, subprocess
data = json.load(open('./design/resources/attachment.json'))
for key in data:
 id=key['doc_id']
 image=key['filename']
 command = 'http://a:a@localhost:2200/resources/'+id
 response = urllib.urlopen(command)
 jsondata = json.loads(response.read())
 rev=jsondata['_rev']
 putAttachment='curl -v -X PUT $COUCHURL/resources/'+id+'/'+image+'?rev='+rev+' --data-binary @'+image+' -H Content-Type:image/jpg'
 p = subprocess.Popen(putAttachment, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
 out, err = p.communicate()
 "
}

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

# Insert dummy data docs
insert_docs communityregistrationrequests ./design/community/community-mockup.json
insert_docs nations ./design/nations/nations-mockup.json
insert_docs resources ./design/resources/resources-mockup.json
insert_docs meetups ./design/meetups/meetups-mockup.json
insert_docs courses ./design/courses/courses-mockup.json
insert_attachment