ARG BASE_IMAGE=treehouses/node:3.21
ARG BUILD_IMAGE=treehouses/node:3.21

FROM ${BUILD_IMAGE} AS builder
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

WORKDIR /

COPY ./gateway/package.json ./gateway/package-lock.json ./

RUN --mount=type=cache,id=npm-builder,target=/root/.npm npm ci

COPY ./gateway/src ./src/
COPY ./gateway/tsconfig.json ./

RUN npm run build
RUN --mount=type=cache,id=npm-builder,target=/root/.npm npm prune --omit=dev

FROM ${BASE_IMAGE}
LABEL maintainer="dogi@ole.org,mutugiii@ole.org"

WORKDIR /

RUN apk add --no-cache poppler-utils
COPY ./gateway/package.json ./gateway/package-lock.json ./

# node_modules is built on the native builder and copied in, so no npm runs under
# emulation. This holds only while every dependency is pure JS — a package with a
# native binary would need to be installed on the target arch instead.
COPY --from=builder /node_modules ./node_modules/
COPY --from=builder /dist ./dist/

CMD ["node", "dist/index.js"]
