#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

YML_PATH=credentials/credentials.yml
PLANET_USER=${PLANET_CREDENTIALS%%,*}
PLANET_PASS=${PLANET_CREDENTIALS##*,}
PLANET_PASS=$(echo $PLANET_PASS | sed -e 's/\$/\$\$/g')
BASE_PASS = $(echo -n $PLANET_USER:$PLANET_PASS | base64)
if [ -f "$YML_PATH" ]; then
  OLD_USER=$(grep COUCHDB_USER $YML_PATH | sed -e 's/.*=//')
fi

if [ -z "$OLD_USER" ] || [ "$PLANET_USER" == "$OLD_USER" ]; then
  rm credentials/credentials.yml
  {
    echo "services:"
    echo "  db-init:"
    echo "    environment:"
    echo "      - COUCHDB_USER=$PLANET_USER"
    echo "      - COUCHDB_PASS=$PLANET_PASS"
    echo "version: \"2\""
  } >> $YML_PATH

  {
    echo "proxy_set_header Authorization \"Basic $BASE_PASS\";"
  } > /etc/nginx/conf.d/auth.txt

fi
