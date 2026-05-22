ARG BASE_IMAGE=node:22-bookworm-slim

FROM ${BASE_IMAGE} as builder
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

COPY ./chatapi/package.json ./

RUN npm install

COPY ./chatapi/src ./src/
COPY ./chatapi/tsconfig.json ./

RUN npm run build

FROM ${BASE_IMAGE}
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*
COPY ./chatapi/package.json ./

RUN npm install --production
COPY --from=builder /dist ./dist/

CMD ["node", "dist/index.js"]
