FROM node:6.11-alpine

WORKDIR /root

RUN apk update ;\
    apk add --no-cache curl git

COPY ./docker-entrypoint.sh /root/docker-entrypoint.sh

CMD sh ./docker-entrypoint.sh
