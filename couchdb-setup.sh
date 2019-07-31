#!/bin/bash

# Function for upsert of design & other configuration docs
upsert_doc() {
  DB=$1
  DOC_NAME=$2
  DOC_LOC=$3
  # Default method is PUT, fourth argument overrides
  METHOD=${4:-"PUT"}
  DOC=$(curl $COUCHURL/$DB/$DOC_NAME $PROXYHEADER)
  # If DOC includes a rev then it exists so we need to update
  # Otherwise we simply insert
  if [[ $DOC == *rev* ]]; then
    DOC_REV=$(echo $DOC | jq -r '. | ._rev')
    curl -H 'Content-Type: application/json' -X $METHOD $COUCHURL/$DB/$DOC_NAME?rev=$DOC_REV -d $DOC_LOC $PROXYHEADER
  else
    curl -H 'Content-Type: application/json' -X $METHOD $COUCHURL/$DB/$DOC_NAME -d $DOC_LOC $PROXYHEADER
  fi
}

# Function for insert mock data docs
insert_docs() {
  DB=$1
  DOC_LOC=$2
  curl -H 'Content-Type: application/json' -X POST $COUCHURL/$DB/_bulk_docs -d @$DOC_LOC $PROXYHEADER
}

# Function to add databases
insert_dbs() {
  DBS=$1
  for DB in "${DBS[@]}"
  do
    curl -X PUT $COUCHURL/$DB $PROXYHEADER
  done
}

# Options are -u for username -w for passWord and -p for port number
while getopts "u:w:p:h:i:x" option; do
  case $option in
    u) COUCHUSER=${OPTARG};;
    w) COUCHPASSWORD=${OPTARG};;
    p) PORT=${OPTARG};;
    h) HOST=${OPTARG};;
    i) INSTALLFLAG=1;;
    x) PROXYHEADER="-H X-Auth-CouchDB-Roles:_admin -H X-Auth-CouchDB-UserName:username"
  esac
done

ISINSTALL=${INSTALLFLAG:-0}

if [ -z "$HOST" ]
then
  HOST=localhost
fi

# Default port for CouchDB accessed from host machine is 2200
PORT=${PORT:-2200}
if [ -z "$COUCHUSER" ]
then
  COUCHURL=http://$HOST:$PORT
else
  COUCHURL=http://$COUCHUSER:$COUCHPASSWORD@$HOST:$PORT
fi

# Adding attachments to database documents
# To add attachment added two file (resources-mock.json and resources-attachment-mockup.json)
# Ids must match between two files
insert_attachments() {
  DB=$1
  DOC_LOC=$2
  # Use echo $(<$DOC_LOC) to be able to run in Windows
  INPUTS=$(echo $(<$DOC_LOC) | jq -c '.[]')
  for i in $INPUTS
  do
    ID=$(echo $i | jq -r '.doc_id' )
    FILE_NAME=$(echo $i | jq -r '.file_name')
    FILE_LOCATION=$(echo $i | jq -r '.file_location')
    FILE_TYPE=$(echo $i | jq -r '.file_type')
    REV=$(curl $COUCHURL/$DB/$ID | jq -r '._rev' $PROXYHEADER)
    curl -X PUT $COUCHURL/$DB/$ID/$FILE_NAME?rev=$REV --data-binary @$FILE_LOCATION -H Content-Type:$FILE_TYPE $PROXYHEADER
  done
}

# Reads one JSON file to update multiple databases
# JSON file needs a 'dbName' field with a string and
# a 'json' field with the JSON to be updated
multi_db_update() {
  DOC_LOC=$1
  DOC_NAME=$2
  INPUTS=$(echo $DOC_LOC | jq -c '.[]')
  for i in $INPUTS
  do
    JSON=$(echo $i | jq -c '. | .json' )
    DB_NAME=$(echo $i | jq -r '. | .dbName')
    upsert_doc $DB_NAME $DOC_NAME $JSON
  done
}

add_security_admin_roles() {
  JSON=$1
  ROLE_NAME=$2
  NEW_DOCS=$(echo $(<$JSON) | jq '.[].json.admins.roles += ["'$ROLE_NAME'"]')
  echo $NEW_DOCS | jq -c '.'
}


DBS=(
  # CouchDB standard databases
  "_users"
  "_replicator"
  "_global_changes"
  # Planet app databases
  "meetups"
  "resources"
  "courses"
  "exams"
  "nations"
  "communityregistrationrequests"
  "feedback"
  "resource_activities"
  "configurations"
  "login_activities"
  "notifications"
  "ratings"
  "shelf"
  "submissions"
  "courses_progress"
  "attachments"
  "send_items"
  "teams"
  "tablet_users"
  "child_users"
  "replicator_users"
  "admin_activities"
  "child_statistics"
  "tags"
  "apk_logs"
  "hubs"
  "achievements"
  "myplanet_activities"
  "news"
  "parent_users"
  "team_activities"
)

insert_dbs $DBS
# Create design documents
node ./design/create-design-docs.js
# Add or update design docs
upsert_doc nations _design/nation-validators @./design/nations/nation-validators.json
upsert_doc resources _design/resources @./design/resources/resources-design.json
upsert_doc _users _design/_auth @./design/users/_auth.json
# Insert indexes
# Note indexes will not overwrite if fields value changes, so make sure to remove unused indexes after changing
upsert_doc login_activities _index '{"index":{"fields":[{"loginTime":"desc"}]},"name":"time-index"}' POST
upsert_doc notifications _index '{"index":{"fields":[{"time":"desc"}]},"name":"time-index"}' POST
upsert_doc ratings _index '{"index":{"fields":[{"item":"desc"}]},"name":"parent-index"}' POST
upsert_doc feedback _index '{"index":{"fields":[{"openTime":"desc"}]},"name":"time-index"}' POST
upsert_doc communityregistrationrequests _index '{"index":{"fields":[{"createdDate":"desc"}]},"name":"time-index"}' POST
upsert_doc activity_logs _index '{"index":{"fields":[{"createdTime":"desc"}]},"name":"time-index"}' POST
upsert_doc resources _index '{"index":{"fields":[{"title":"asc"}]},"name":"time-index"}' POST
upsert_doc news _index '{"index":{"fields":[{"time":"desc"}]},"name":"time-index"}' POST
upsert_doc tags _index '{"index":{"fields":[{"name":"asc"}]},"name":"name-index"}' POST
upsert_doc team_activities _index '{"index":{"fields":[{"time":"desc"}]},"name":"time-index"}' POST
# Only insert dummy data and update security on install
# _users security is set in app and auto accept will be overwritten if set here
if (($ISINSTALL))
then
  # Insert dummy data docs
  insert_docs meetups ./design/meetups/meetups-mockup.json
  insert_docs courses ./design/courses/courses-mockup.json
  insert_docs resources ./design/resources/resources-mockup.json
  insert_attachments resources ./design/resources/resources-attachment-mockup.json
  # When attachment database is implemented in app, uncomment below line and delete above line
  # insert_attachments attachments ./design/resources/resources-attachment-mockup.json
  # Add permission in databases
  SECURITY=$(add_security_admin_roles ./design/security-update/security-update-once.json manager)
  multi_db_update $SECURITY _security
fi
SECURITY=$(add_security_admin_roles ./design/security-update/security-update.json manager)
multi_db_update $SECURITY _security
# Increase session timeout
upsert_doc _node/nonode@nohost/_config couch_httpd_auth/timeout '"2400"'
# Increse http request size for large attachments
upsert_doc _node/nonode@nohost/_config httpd/max_http_request_size '"1073741824"'
# Increse replication timeout
upsert_doc _node/nonode@nohost/_config replicator/connection_timeout '"300000"'

# Make user database public
upsert_doc _node/nonode@nohost/_config couch_httpd_auth/users_db_public '"true"'
# Specify user public fields (note: adding spaces to string breaks upsert_doc)
upsert_doc _node/nonode@nohost/_config couch_httpd_auth/public_fields '"name,firstName,middleName,lastName,roles,isUserAdmin,joinDate,email,phoneNumber,gender,planetCode,parentCode,language,birthDate,level"'
