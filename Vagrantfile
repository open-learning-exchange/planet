# -*- mode: ruby -*-
# vi: set ft=ruby :

# The most common configuration options are documented and commented below.
# For a complete reference, please see the online documentation at
# https://docs.vagrantup.com.

Vagrant.configure(2) do |config|

  if Vagrant.has_plugin?("vagrant-vbguest")
    config.vbguest.auto_update = false
  end

  BOX = "treehouses/buster64"
  BOX_VERSION = "0.10.1"

  # production VM
  config.vm.define "prod" do |prod|
    prod.vm.box = BOX
    prod.vm.box_version = BOX_VERSION

    prod.vm.hostname = "planet"

    prod.vm.provider "virtualbox" do |vb|
      vb.name = "planet"
    end

    prod.vm.provider "virtualbox" do |vb|
      vb.memory = "666"
    end

    # Port expose for docker inside vagrant (2300:2300 = CouchDB 3100:3100 = App)
    prod.vm.network "forwarded_port", guest: 80, host: 80, auto_correct: true
    prod.vm.network "forwarded_port", guest: 80, host: 3100, auto_correct: true
    prod.vm.network "forwarded_port", guest: 80, host: 8080, auto_correct: true
    prod.vm.network "forwarded_port", guest: 2200, host: 2300, auto_correct: true
    prod.vm.network "forwarded_port", guest: 2200, host: 5984, auto_correct: true
    prod.vm.network "forwarded_port", guest: 22, host: 2223, host_ip: "0.0.0.0", id: "ssh", auto_correct: true

    # Prevent TTY Errors (copied from laravel/homestead: "homestead.rb" file)... By default this is "bash -l".
    prod.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

    prod.vm.provision "shell", inline: <<-SHELL
      # docker-compose in install mode ... ?
    SHELL

    # Start docker on every startup
    prod.vm.provision "shell", run: "always", inline: <<-SHELL
      if [ -f /srv/planet/pwd/credentials.yml ]; then
        docker-compose -f planet.yml -f volumes.yml -f /srv/planet/pwd/credentials.yml -p planet up -d
      else
        docker-compose -f planet.yml -f volumes.yml -p planet up -d
        docker wait planet_db-init_1
        docker start planet_db-init_1
      fi
    SHELL
  end

  # development VM
  config.vm.define "dev", autostart: false do |dev|
    dev.vm.box = BOX
    dev.vm.box_version = BOX_VERSION

    dev.vm.hostname = "dev"

    dev.vm.provider "virtualbox" do |vb|
      vb.name = "dev"
    end

    dev.vm.provider "virtualbox" do |vb|
      vb.memory = "1111"
    end

    # Port expose for dev server (5984:2200 = CouchDB 3000:3000 = App)
    dev.vm.network "forwarded_port", guest: 5984, host: 2200, auto_correct: true
    dev.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
    # Port expose for unit tests (Karma)
    dev.vm.network "forwarded_port", guest: 9876, host: 9876, auto_correct: true
    dev.vm.network "forwarded_port", guest: 22, host: 2222, host_ip: "0.0.0.0", id: "ssh", auto_correct: true

    # Prevent TTY Errors (copied from laravel/homestead: "homestead.rb" file)... By default this is "bash -l".
    dev.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

    dev.vm.provision "shell", inline: <<-SHELL
      # Add CouchDB Docker
      sudo docker run -d -p 5984:5984 --name planet \
        -v /srv/planet/conf:/opt/couchdb/etc/local.d \
        -v /srv/planet/data:/opt/couchdb/data \
        -v /srv/planet/log:/opt/couchdb/var/log/ \
        treehouses/couchdb:2.3.0

      # Add CORS to CouchDB so app has access to databases
      #git clone https://github.com/pouchdb/add-cors-to-couchdb.git
      #cd add-cors-to-couchdb
      #npm install
      cd add-cors-to-couchdb
      while ! curl -X GET http://127.0.0.1:5984/_all_dbs ; do sleep 1; done
      node bin.js http://localhost:5984
      cd /vagrant
      # End add CORS to CouchDB

      curl -X PUT http://localhost:5984/_node/nonode@nohost/_config/log/file -d '"/opt/couchdb/var/log/couch.log"'
      curl -X PUT http://localhost:5984/_node/nonode@nohost/_config/log/writer -d '"file"'
      curl -X PUT http://localhost:5984/_node/nonode@nohost/_config/chttpd/authentication_handlers -d '"{chttpd_auth, cookie_authentication_handler}, {couch_httpd_auth, proxy_authentication_handler}, {chttpd_auth, default_authentication_handler}"'

      docker restart planet

      # node_modules folder breaks when setting up in Windows, so use binding to fix
      #echo "Preparing local node_modules folder…"
      #mkdir -p /vagrant_node_modules
      mkdir -p /vagrant/node_modules
      chown vagrant:vagrant /vagrant_node_modules
      mount --bind /vagrant_node_modules /vagrant/node_modules
      npm i --unsafe-perm
      #sudo npm run webdriver-set-version
      # End node_modules fix

      # Add initial Couch databases here
      chmod +x couchdb-setup.sh
      . couchdb-setup.sh -p 5984 -i
      # End Couch database addition
    SHELL

    # Run binding on each startup make sure the mount is available on VM restart
    dev.vm.provision "shell", run: "always", inline: <<-SHELL
      if [ $(docker inspect -f '{{.State.Running}}' planet) = "false" ]; then
        docker start planet
        while ! curl -X GET http://127.0.0.1:5984/_all_dbs ; do sleep 1; done
        cd /vagrant
        . couchdb-setup.sh -p 5984 -x
      fi
      mount --bind /vagrant_node_modules /vagrant/node_modules
      # Starts the app in a screen (virtual terminal)
      sudo -u vagrant screen -dmS build bash -c 'cd /vagrant; ng serve'
    SHELL
  end

end
