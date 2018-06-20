FROM node:8.11.2-alpine as builder
LABEL maintainer="sahil@ole.org,mappuji@ole.org"

WORKDIR /ng-app
COPY package.json ./
RUN npm i --silent

COPY . .
RUN $(npm bin)/ng build --prod --output-path=dist/en
RUN $(npm bin)/ng build --prod --output-path=dist/ar --aot --i18n-file=src/i18n/messages.ar.xlf --i18n-locale=ar --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist/es --aot --i18n-file=src/i18n/messages.es.xlf --i18n-locale=es --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist/fr --aot --i18n-file=src/i18n/messages.fr.xlf --i18n-locale=fr --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist/ne --aot --i18n-file=src/i18n/messages.ne.xlf --i18n-locale=ne --i18n-format=xlf

#####

FROM nginx:1.13.3-alpine
COPY docker/planet/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /ng-app/dist /usr/share/nginx/html
COPY docker/planet/docker-entrypoint.sh ./

CMD sh ./docker-entrypoint.sh
