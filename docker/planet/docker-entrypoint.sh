#!/bin/sh

if [ -z "$HOST_PROTOCOL" ]
then
  PROTOCOL="http"
elif [ "$HOST_PROTOCOL" = "https" ]
then
  PROTOCOL="https"
else
  PROTOCOL="http"
fi

if [ "$MULTIPLE_IPS" = "true" ]
then
    sed -i -e 's#couchAddress:"planet-db-host:planet-db-port/"#couchAddress:window.location.protocol+"//"+window.location.hostname+":planet-db-port/"#g' /usr/share/nginx/html/main*
else
    sed -i -e "s#planet-db-host#$PROTOCOL://$DB_HOST#g" /usr/share/nginx/html/main*
fi

sed -i -e "s#planet-db-port#$DB_PORT#g" /usr/share/nginx/html/main*

nginx -g "daemon off;"

