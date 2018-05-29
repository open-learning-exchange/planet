FROM node:6.11-alpine as builder
LABEL maintainer="sahil@ole.org,mappuji@ole.org"

WORKDIR /ng-app
COPY package.json ./
RUN npm i --silent

COPY . .
RUN $(npm bin)/ng build --prod --output-path=dist-ar --aot --i18n-file=src/i18n/messages.ar.xlf --locale=ar --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist-en --aot --i18n-file=src/i18n/messages.en.xlf --locale=en --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist-es --aot --i18n-file=src/i18n/messages.es.xlf --locale=es --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist-fr --aot --i18n-file=src/i18n/messages.fr.xlf --locale=fr --i18n-format=xlf
RUN $(npm bin)/ng build --prod --output-path=dist-ne --aot --i18n-file=src/i18n/messages.ne.xlf --locale=ne --i18n-format=xlf

#####

FROM nginx:1.13.3-alpine
COPY docker/planet/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /ng-app/dist-ar /usr/share/nginx/html/ar
COPY --from=builder /ng-app/dist-en /usr/share/nginx/html/en
COPY --from=builder /ng-app/dist-es /usr/share/nginx/html/es
COPY --from=builder /ng-app/dist-fr /usr/share/nginx/html/fr
COPY --from=builder /ng-app/dist-ne /usr/share/nginx/html/ne
COPY docker/planet/docker-entrypoint.sh ./

CMD sh ./docker-entrypoint.sh
