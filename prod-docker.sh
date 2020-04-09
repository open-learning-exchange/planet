#!/bin/bash

# Options are -h for hub -u to start docker
while getopts "hu" option; do
  case $option in
    h) HUBFLAG=1;;
    u) UPFLAG=1;;
  esac
done

ISHUB=${HUBFLAG:-0}
ISUP=${UPFLAG:-0}

if (($ISHUB)); then
  NAME="hub"
  YMLDIR="/vagrant/docker/"
  VOLUMES="volumes_hub.yml"
else
  NAME="planet"
  YMLDIR="/home/vagrant/"
  VOLUMES="volumes.yml"
fi

if (($ISUP)); then
  CMD="up -d"
else
  CMD="stop"
fi

if [ -f /srv/$NAME/pwd/credentials.yml ]; then
  docker-compose -f $YMLDIR$NAME.yml -f $YMLDIR$VOLUMES -f /srv/$NAME/pwd/credentials.yml -p $NAME $CMD
else
  docker-compose -f $YMLDIR$NAME.yml -f $YMLDIR$VOLUMES -p $NAME $CMD
  docker wait $NAME'_db-init_1'
  docker start $NAME'_db-init_1'
fi
