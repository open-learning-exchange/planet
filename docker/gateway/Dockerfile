ARG BASE_IMAGE
ARG BUILD_IMAGE=treehouses/node:3.21

FROM --platform=$BUILDPLATFORM ${BUILD_IMAGE} AS builder
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

WORKDIR /

COPY ./gateway/package.json ./gateway/package-lock.json ./

RUN --mount=type=cache,id=npm-builder,target=/root/.npm npm ci

COPY ./gateway/src ./src/
COPY ./gateway/tsconfig.json ./

RUN npm run build
RUN --mount=type=cache,id=npm-builder,target=/root/.npm npm prune --omit=dev
RUN ! find node_modules -name '*.node' | grep .

FROM ${BASE_IMAGE}
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

WORKDIR /

RUN apk add --no-cache poppler-utils
COPY ./gateway/package.json ./gateway/package-lock.json ./

COPY --from=builder /node_modules ./node_modules/
COPY --from=builder /dist ./dist/

CMD ["node", "dist/index.js"]
