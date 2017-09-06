# Fork of https://github.com/iliyan-trifonov/node-nvm
# But with different purpose
FROM debian:stretch-slim

MAINTAINER Abdurrachman Mappuji <mappuji@ole.org>

ENV APP planet

# change it to your required node version
# node 6.11.2 is current LTS for version 6
ENV NODE_VERSION 6.11.2
ENV NVM_VERSION v0.33.3 

# install required software before using nvm/node/npm/bower
RUN apt-get update \
  && apt-get install -y sudo \
  && apt-get install -y curl git python build-essential \
  # add user defined and use it to install node/npm and run the app
  && groupadd -r $APP && useradd -r -g $APP $APP

USER $APP

#needed by nvm install
ENV NVM_DIR /home/$APP/.nvm

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/"$NVM_VERSION"/install.sh | bash \
  # install the specified node version and set it as the default one, install the global npm packages
  && . ~/.nvm/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default $NODE_VERSION \
  # install angular cli
  && npm install -g @angular/cli --user $CUSTOM_USER

# exposes port 3000 but your app may use any port specified in it
EXPOSE 3000

VOLUME ["/planet"]
WORKDIR /planet

ENTRYPOINT ["/bin/bash", "-c"]
