FROM treehouses/nginx

RUN rm -rf /usr/share/nginx/html/*
RUN apk add --no-cache \
      fcgi \
    fcgiwrap \
    spawn-fcgi \
      ca-certificates \
      nghttp2-libs \
      libssh2 \
      libcurl \
    curl \
      oniguruma \
    jq \
      openssl

COPY docker/planet/default.conf /etc/nginx/conf.d/
COPY package.json ./
COPY docker/planet/scripts/ ./
RUN mkdir -p /usr/share/nginx/html \
    && cat package.json | jq -r .version > /usr/share/nginx/html/version
COPY ./dist/eng /usr/share/nginx/html
COPY docker/planet/nginx/ /usr/share/nginx/html

RUN ./create_version_json.sh

CMD ./docker-entrypoint.sh
