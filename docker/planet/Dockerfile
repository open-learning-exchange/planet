FROM node:8.11.2-alpine as builder
LABEL maintainer="sahil@ole.org,mappuji@ole.org"

ARG LANGUAGE_MODE="single"
ENV I18N ${LANGUAGE_MODE}

WORKDIR /ng-app

COPY package.json ./
COPY docker/planet/scripts/ ./
COPY . .

RUN apk add --update \
    python \
    build-base \
    jq
RUN npm i --silent
RUN ./compile_planet.sh
RUN cat package.json | jq -r .version > dist/version
RUN cat appmeta.json > dist/appmeta

#####

FROM nginx:1.13.3-alpine
COPY docker/planet/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /ng-app/dist /usr/share/nginx/html
RUN apk add --update \
    fcgiwrap \
    spawn-fcgi \
    curl
COPY docker/planet/scripts/docker-entrypoint.sh ./
COPY docker/planet/nginx/ /usr/share/nginx/html

CMD ./docker-entrypoint.sh
