#!/usr/bin/env sh

# Function for protocol
check_protocol() {
  PARAM=$1
  DEFAULT=$2
  if [ -z "$PARAM" ]
  then
    PROTO="$DEFAULT"
  elif [ "$PARAM" = "https" ]
  then
    PROTO="https"
  else
    PROTO="http"
  fi
  echo "$PROTO"
}

PROTOCOL=$(check_protocol $HOST_PROTOCOL "http")
P_PROTOCOL=$(check_protocol $PARENT_PROTOCOL "https")

if [ "$MULTIPLE_IPS" = "true" ]
then
    sed -i -e 's#couchAddress:"planet-db-host:planet-db-port/"#couchAddress:window.location.protocol+"//"+window.location.hostname+":planet-db-port/"#g' /usr/share/nginx/html/**/main*
else
    sed -i -e "s#planet-db-host#$PROTOCOL://$DB_HOST#g" /usr/share/nginx/html/**/main*
fi

sed -i -e "s#planet-db-port#$DB_PORT#g" /usr/share/nginx/html/**/main*
sed -i -e "s#planet-center-address#$CENTER_ADDRESS#g" /usr/share/nginx/html/**/main*
sed -i -e "s#planet-parent-protocol#$P_PROTOCOL#g" /usr/share/nginx/html/**/main*

spawn-fcgi -s /run/fcgi.sock -U nginx -G nginx /usr/bin/fcgiwrap
nginx -g "daemon off;"
