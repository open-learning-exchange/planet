FROM node:10.16.0-alpine as builder
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
RUN ./create_version_json.sh

#####

FROM nginx:1.16.0-alpine

RUN rm -rf /usr/share/nginx/html/*
RUN apk add --no-cache \
      fcgi=2.4.0-r8 \
    fcgiwrap=1.1.0-r3 \
    spawn-fcgi=1.6.4-r3 \
      ca-certificates=20190108-r0 \
      nghttp2-libs=1.35.1-r1 \
      libssh2=1.8.2-r0 \
      libcurl=7.64.0-r2 \
    curl=7.64.0-r2 \
      oniguruma=6.9.1-r0 \
    jq=1.6-r0

COPY docker/planet/default.conf /etc/nginx/conf.d/
COPY docker/planet/scripts/docker-entrypoint.sh ./
COPY --from=builder /ng-app/dist /usr/share/nginx/html
COPY docker/planet/nginx/ /usr/share/nginx/html

CMD ./docker-entrypoint.sh
