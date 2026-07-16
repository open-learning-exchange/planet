ARG BASE_IMAGE=treehouses/node:3.21

FROM ${BASE_IMAGE} as builder
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

COPY ./gateway/package.json ./gateway/package-lock.json ./

RUN npm ci

COPY ./gateway/src ./src/
COPY ./gateway/tsconfig.json ./

RUN npm run build

FROM ${BASE_IMAGE}
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

RUN apk add --no-cache poppler-utils
COPY ./gateway/package.json ./gateway/package-lock.json ./

RUN npm ci --omit=dev
COPY --from=builder /dist ./dist/

CMD ["node", "dist/index.js"]
