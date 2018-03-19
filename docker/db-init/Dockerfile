FROM node:6.11-alpine

RUN apk update ;\
    apk add --no-cache bash curl git jq ca-certificates;\
    #CORS DOWNLOAD
    npm install -g add-cors-to-couchdb

WORKDIR /root

COPY ./docker/db-init/docker-entrypoint.sh /root/docker-entrypoint.sh
COPY ./couchdb-setup.sh /root/couchdb-setup.sh
ADD ./design /root/design

CMD sh ./docker-entrypoint.sh
