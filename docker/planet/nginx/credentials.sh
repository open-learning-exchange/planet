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

function gen_nginx_conf {
  BASE_PASS=$(echo -n $1:$2 | base64)
  {
      echo "proxy_set_header Authorization \"Basic $BASE_PASS\";"
  } > /etc/nginx/conf.d/auth.txt
}

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

  gen_nginx_conf $PLANET_USER $PLANET_PASS
else
  gen_nginx_conf $OLD_USER $OLD_PASS
fi
