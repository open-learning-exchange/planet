
FROM node:6.11-stretch
ENV APP planet
MAINTAINER Abdurrachman Mappuji <mappuji@ole.org>
# context must be in root repository
COPY . /$APP
WORKDIR /$APP
# install required software before using nvm/node/npm/bower
RUN apt-get update \
  && apt-get install -y curl git python build-essential \
  && npm install

FROM node:6.11-alpine
RUN apk --no-cache add ca-certificates
WORKDIR /$APP
COPY --from=0 /$APP .

CMD bash -c 'ng serve'
