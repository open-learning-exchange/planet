FROM treehouses/node

RUN apk update ;\
    apk add --no-cache bash curl git jq ca-certificates

RUN npm config set unsafe-perm true \
    && npm install -g add-cors-to-couchdb \
    && npm config set unsafe-perm false

WORKDIR /root

COPY ./docker/db-init/docker-entrypoint.sh /root/docker-entrypoint.sh
COPY ./couchdb-setup.sh /root/couchdb-setup.sh
ADD ./design /root/design

CMD bash ./docker-entrypoint.sh
