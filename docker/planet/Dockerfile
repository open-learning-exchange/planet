FROM node:8.11.2-alpine as builder
LABEL maintainer="sahil@ole.org,mappuji@ole.org"

WORKDIR /ng-app
COPY package.json ./
RUN npm i --silent

COPY . .
RUN $(npm bin)/ng build --prod --base-href /eng/ --output-path=dist/eng
RUN $(npm bin)/ng build --prod --base-href /ara/ --output-path=dist/ara --aot --i18n-file=src/i18n/messages.ara.xlf --i18n-locale=ar --i18n-format=xlf
RUN $(npm bin)/ng build --prod --base-href /spa/ --output-path=dist/spa --aot --i18n-file=src/i18n/messages.spa.xlf --i18n-locale=es --i18n-format=xlf
RUN $(npm bin)/ng build --prod --base-href /fra/ --output-path=dist/fra --aot --i18n-file=src/i18n/messages.fra.xlf --i18n-locale=fr --i18n-format=xlf
RUN $(npm bin)/ng build --prod --base-href /nep/ --output-path=dist/nep --aot --i18n-file=src/i18n/messages.nep.xlf --i18n-locale=ne --i18n-format=xlf

#####

FROM nginx:1.13.3-alpine
COPY docker/planet/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /ng-app/dist /usr/share/nginx/html
COPY docker/planet/docker-entrypoint.sh ./

CMD sh ./docker-entrypoint.sh
