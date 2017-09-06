FROM node:6.11-alpine

WORKDIR /root

RUN apk update ;\
    apk add curl ;\
    apk add git

ADD ./docker-entrypoint.sh /usr/local/bin

CMD docker-entrypoint.sh
