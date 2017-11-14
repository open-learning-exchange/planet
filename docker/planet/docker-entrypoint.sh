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

sed -i -e "s#planet-db-host#$PROTOCOL://$DB_HOST#g" /usr/share/nginx/html/main*
sed -i -e "s#planet-db-port#$DB_PORT#g" /usr/share/nginx/html/main*

nginx -g "daemon off;"

