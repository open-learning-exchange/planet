# Welcome to Planet
[![Maintainability](https://api.codeclimate.com/v1/badges/028682cc4cd969b05280/maintainability)](https://codeclimate.com/github/open-learning-exchange/planet/maintainability)
[![Build Status](https://travis-ci.org/open-learning-exchange/planet.svg?branch=master)](https://travis-ci.org/open-learning-exchange/planet)

## What's Planet

Planet is a web-application that includes everything needed to create a platform for ~~organization~~ community to manage their learning content and learner collaboration which has 3 main components, community, nation, and earth.

Understanding the 3 main components is key to understanding Planet. Planet divides it installed instance as community, nation, or earth. Organization can install Planet as community, nation, or earth.

## Community

Community is the smallest entity of Planet member, at it root, every installation of Planet is a community, but we call the installation (or node) as community if it doesn't have another community report to it. A community belong to nation and can exchange contents. Think of it as a subscriber in publisher-subscriber model.

## Nation

Nation is a an entity which has at least one community belongs to it and as a nation it can publish content which can be consumed by the communities. In its relationship with communities, think of it as a publisher in pub-sub model. The recommended setup is one country has one nation which all the communities in that country consumes its content.

In Planet, nation has a unique role where it not only act as a publisher for community, but it is a subscribe of Earth where in our framework there is one Earth which managed by [Open Learning Exchange][OLE] where it backed the initiative (But you can be your own Earth too, it is an open source project anyway).

## Earth

Similar as a nation to community, earth act as a publisher - perhaps the upstream publisher for all the content the community might consumes. It is exist as a way to exchange contents between nation.

## Technologies

We use Angular for our front-end and CouchDB as our back-end and database. And for the deployment we highly support Docker, but an old-school deployment in bare-metal or VM is also supported. We also support Raspberry-Pi deployment and in fact we have a lot of communities running in this little machine.

## Getting Started

1. Install CouchDB 2.0

    1.1. OSX

        $ brew install couchdb

    1.2. Ubuntu

        $ apt-get install couchdb

    1.3. Docker

        $ docker run -p 5984:5984 -d --name my-couchdb treehouses/couchdb:2.2.0
 
2. Populate database schema and dummy data (optional)

    2.1. Setup CORS in the CouchDB

        $ npm install -g add-cors-to-couchdb
        $ add-cors-to-couchdb $COUCHDB_HOST

    2.2. Migrate schema and dummy data

    2.2.1. First time installation

        $ ./couchdb-setup.sh -p $COUCHDB_PORT -h $COUCHDB_DOMAIN -i

    2.2.2 

        $ ./couchdb-setup.sh -p $COUCHDB_PORT -h $COUCHDB_DOMAIN -u $COUCHDB_USER -w $COUCHDB_PASS

3. Run the app!

        $ ng serve

4. Go to `localhost:4000` and you'll see 'Welcome to Planet'
5. Follow this [guidelines][MORE_GUIDELINE] to start using Planet in your community!

## Contributing

[![Open Source Helpers](https://www.codetriage.com/open-learning-exchange/planet/badges/users.svg)](https://www.codetriage.com/open-learning-exchange/planet)
[![OLE's Gitter](https://badges.gitter.im/open-learning-exchange/gitter.png)][OLE_CHATROOM]

We encourage you to contribute to Planet! Please check out the [Contributing to Planet](CONTRIBUTING.md) guide for guidelines about how to proceed. Join us!

## License

Planet is released under the [AGPL-3.0](LICENSE)

[OLE]: https://www.ole.org/
[OLE_CHATROOM]: https://gitter.im/open-learning-exchange/chat
[MORE_GUIDELINE]: http://open-learning-exchange.github.io/#!./pages/vi/vi-planet-installation-and-configuration.md
