FROM node:8.11.2-alpine as builder
LABEL maintainer="sahil@ole.org,mappuji@ole.org"

WORKDIR /ng-app
COPY package.json ./
RUN npm i --silent

COPY . .
RUN $(npm bin)/ng build --prod

#####

FROM nginx:1.13.3-alpine
COPY docker/planet/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /ng-app/dist /usr/share/nginx/html
COPY docker/planet/docker-entrypoint.sh ./

CMD sh ./docker-entrypoint.sh
