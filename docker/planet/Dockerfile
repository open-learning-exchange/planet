FROM node:6.11-stretch

MAINTAINER Abdurrachman Mappuji <mappuji@ole.org>

ENV APP planet

# install required software before using nvm/node/npm/bower
RUN apt-get update \
  && apt-get install -y curl git python build-essential \
  # install angular cli
  && npm install -g @angular/cli

# exposes port 3000 but your app may use any port specified in it
EXPOSE 3000

VOLUME ["/$APP"]
WORKDIR /$APP

#ADD ./docker-entrypoint.sh docker-entrypoint.sh

#ENTRYPOINT ["/bin/bash", "-c"]
CMD bash -c 'npm install && ng serve'
