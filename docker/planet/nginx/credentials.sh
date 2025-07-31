#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

YML_PATH=credentials/credentials.yml
PLANET_USER=${PLANET_CREDENTIALS%%,*}
PLANET_PASS=${PLANET_CREDENTIALS##*,}
PLANET_PASS=$(echo $PLANET_PASS | sed -e 's/\$/\$\$/g')

mkdir -p credentials

if [ -f "$YML_PATH" ]; then
  OLD_USER=$(grep COUCHDB_USER $YML_PATH | sed -e 's/.*=//')
  OLD_PASS=$(grep COUCHDB_PASS $YML_PATH | sed -e 's/.*=//')
fi

if [ ! -z "$PLANET_USER" ] && ([ -z "$OLD_USER" ] || [ "$PLANET_USER" == "$OLD_USER" ]); then
  rm -f credentials/credentials.yml
  {
    echo "services:"
    echo "  chatapi:"
    echo "    environment:"
    echo "      - COUCHDB_USER=$PLANET_USER"
    echo "      - COUCHDB_PASS=$PLANET_PASS"
    echo "  db-init:"
    echo "    environment:"
    echo "      - COUCHDB_USER=$PLANET_USER"
    echo "      - COUCHDB_PASS=$PLANET_PASS"
    echo "version: \"2\""
  } >> $YML_PATH
fi
