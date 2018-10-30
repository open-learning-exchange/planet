# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.define "dev" do |dev|
    dev.vm.box = "ole/stretch64"
    dev.vm.box_version = "0.5.3"

    dev.vm.hostname = "planet"

    dev.vm.define "planet" do |planet|
    end

    dev.vm.provider "virtualbox" do |vb|
      vb.name = "planet"
    end

    # Disable automatic box update checking. If you disable this, then
    # boxes will only be checked for updates when the user runs
    # `vagrant box outdated`. This is not recommended.
    # config.vm.box_check_update = false

    # Create a forwarded port mapping which allows access to a specific port
    # within the machine from a port on the host machine. In the example below,
    # accessing "localhost:8082" will access port 80 on the guest machine.
    # config.vm.network "forwarded_port", guest: 80, host: 8082
    # Port expose for dev server (5984:2200 = CouchDB 3000:3000 = App)
    dev.vm.network "forwarded_port", guest: 5984, host: 2200, auto_correct: true
    dev.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
    # Port expose for unit tests (Karma)
    dev.vm.network "forwarded_port", guest: 9876, host: 9876, auto_correct: true
    dev.vm.network "forwarded_port", guest: 22, host: 2222, host_ip: "0.0.0.0", id: "ssh", auto_correct: true

    # Create a private network, which allows host-only access to the machine
    # using a specific IP.
    # config.vm.network "private_network", ip: "192.168.33.10"

    # Create a public network, which generally matched to bridged network.
    # Bridged networks make the machine appear as another physical device on
    # your network.
    # config.vm.network "public_network"

    # Share an additional folder to the guest VM. The first argument is
    # the path on the host to the actual folder. The second argument is
    # the path on the guest to mount the folder. And the optional third
    # argument is a set of non-required options.
    # config.vm.synced_folder "../data", "/vagrant_data"

    # Provider-specific configuration so you can fine-tune various
    # backing providers for Vagrant. These expose provider-specific options.
    # Example for VirtualBox:
    #
    dev.vm.provider "virtualbox" do |vb|
    #   # Display the VirtualBox GUI when booting the machine
    #   vb.gui = true
    #
    #   # Customize the amount of memory on the VM:
      vb.memory = "1111"
    end
    #
    # View the documentation for the provider you are using for more
    # information on available options.

    # Define a Vagrant Push strategy for pushing to Atlas. Other push strategies
    # such as FTP and Heroku are also available. See the documentation at
    # https://docs.vagrantup.com/v2/push/atlas.html for more information.
    # config.push.define "atlas" do |push|
    #   push.app = "YOUR_ATLAS_USERNAME/YOUR_APPLICATION_NAME"
    # end

    # Prevent TTY Errors (copied from laravel/homestead: "homestead.rb" file)... By default this is "bash -l".
    dev.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

    # Enable provisioning with a shell script. Additional provisioners such as
    # Puppet, Chef, Ansible, Salt, and Docker are also available. Please see the
    # documentation for more information about their specific syntax and use.
    dev.vm.provision "shell", inline: <<-SHELL
      # Add CouchDB Docker
      sudo docker run -d -p 5984:5984 --name planet -v /srv/data/bell:/opt/couchdb/data -v /srv/log/bell:/opt/couchdb/var/log/ treehouses/couchdb:2.2.0

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

      # node_modules folder breaks when setting up in Windows, so use binding to fix
      #echo "Preparing local node_modules folder…"
      #mkdir -p /vagrant_node_modules
      mkdir -p /vagrant/node_modules
      #chown vagrant:vagrant /vagrant_node_modules
      #mount --bind /vagrant_node_modules /vagrant/node_modules
      #npm i --unsafe-perm
      #sudo npm run webdriver-set-version
      # End node_modules fix

      # Add initial Couch databases here
      chmod +x couchdb-setup.sh
      ./couchdb-setup.sh -p 5984 -i
      # End Couch database addition

    SHELL

    # Run binding on each startup make sure the mount is available on VM restart
    dev.vm.provision "shell", run: "always", inline: <<-SHELL
      docker start planet
      mount --bind /vagrant_node_modules /vagrant/node_modules
      # Starts the app in a screen (virtual terminal)
      sudo -u vagrant screen -dmS build bash -c 'cd /vagrant; ng serve'
    SHELL
  end

  config.vm.define "prod" do |prod|
    prod.vm.box = "ole/stretch64"
    prod.vm.box_version = "0.5.3"

    prod.vm.hostname = "planet-prod"
    # Port expose for docker inside vagrant (2300:2300 = CouchDB 3100:3100 = App)
    prod.vm.network "forwarded_port", guest: 3100, host: 3100, auto_correct: true
    prod.vm.network "forwarded_port", guest: 2300, host: 2300, auto_correct: true

    prod.vm.provider "virtualbox" do |vb|
      vb.name = "planet-prod"
    end

    prod.vm.provision "shell", inline: <<-SHELL
      docker pull treehouses/planet:0.5.3
      docker pull treehouses/planet:db-init-0.5.3
      docker tag treehouses/planet:0.5.3 treehouses/planet:local
      docker tag treehouses/planet:db-init-0.5.3 treehouses/planet:db-init-local
      wget https://raw.githubusercontent.com/open-learning-exchange/planet/master/docker/planet.yml
      wget https://raw.githubusercontent.com/open-learning-exchange/planet/master/docker/volumes.yml
      wget https://raw.githubusercontent.com/open-learning-exchange/planet/master/docker/install.yml
      sed -i 's/2200:5984/2300:5984/' planet.yml
      sed -i 's/80:80/3100:80/' planet.yml
      docker-compose -f install.yml -f planet.yml -f volumes.yml -p planet up -d
    SHELL

    # Start docker on every startup
    prod.vm.provision "shell", run: "always", inline: <<-SHELL
      if [ -f /srv/planet/pwd/credentials.yml ]; then
        docker-compose -f planet.yml -f volumes.yml -f /srv/planet/pwd/credentials.yml -p planet up -d
      else
        docker-compose -f planet.yml -f volumes.yml -p planet up -d
      fi
    SHELL
  end

end
