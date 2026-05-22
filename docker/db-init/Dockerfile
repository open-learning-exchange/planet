ARG BASE_IMAGE=node:20-bookworm-slim

FROM ${BASE_IMAGE}
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      curl \
      git \
      jq \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g add-cors-to-couchdb

WORKDIR /root

COPY ./docker/db-init/docker-entrypoint.sh /root/docker-entrypoint.sh
COPY ./couchdb-setup.sh /root/couchdb-setup.sh
ADD ./design /root/design

CMD ["bash", "./docker-entrypoint.sh"]
