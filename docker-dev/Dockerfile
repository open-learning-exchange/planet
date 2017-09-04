# Fork of https://github.com/iliyan-trifonov/node-nvm
# But with different purpose
FROM debian:stretch-slim

MAINTAINER Abdurrachman Mappuji <mappuji@ole.org>

ENV CUSTOM_USER ole

# install required software before using nvm/node/npm/bower
RUN apt-get update \
  && apt-get install -y sudo \
  && apt-get install -y curl git python build-essential \
  # add user defined and use it to install node/npm and run the app
  && useradd --home /home/$CUSTOM_USER -m -U -s /bin/bash $CUSTOM_USER \
  # allow some limited sudo commands for user defined
  && echo 'Defaults !requiretty' >> /etc/sudoers \
  && echo '$CUSTOM_USER ALL= NOPASSWD: /usr/sbin/dpkg-reconfigure -f noninteractive tzdata, /usr/bin/tee /etc/timezone, /bin/chown -R $CUSTOM_USER\:$CUSTOM_USER /planet' >> /etc/sudoers

USER $CUSTOM_USER

# change it to your required node version
# node 6.11.2 is current LTS for version 6
ENV NODE_VERSION 6.11.2

#needed by nvm install
ENV NVM_DIR /home/$CUSTOM_USER/.nvm

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.3/install.sh | bash \
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

ADD docker-dev/docker-entrypoint.sh /docker-entrypoint.sh
CMD ["sudo /docker-entrypoint.sh"]
