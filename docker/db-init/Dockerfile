FROM node:6.11-alpine

RUN apk update ;\
    apk add --no-cache curl git ;\
    #CORS DOWNLOAD
    npm install -g add-cors-to-couchdb

WORKDIR /root

COPY ./docker-entrypoint.sh /root/docker-entrypoint.sh

CMD sh ./docker-entrypoint.sh
