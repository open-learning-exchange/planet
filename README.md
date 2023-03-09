[![Maintainability](https://api.codeclimate.com/v1/badges/028682cc4cd969b05280/maintainability)](https://codeclimate.com/github/open-learning-exchange/planet/maintainability)
[![Build Status](https://travis-ci.org/open-learning-exchange/planet.svg?branch=master)](https://travis-ci.org/open-learning-exchange/planet)
[![Docker Stars](https://img.shields.io/docker/stars/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)
[![Docker Pulls](https://img.shields.io/docker/pulls/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)


# **Planet Learning**

Planet Learning is a generic learning system built in Angular & CouchDB.

Link to [Angular Doc](https://angular.io/docs) and [Material Design](https://material.angular.io/).

## To work on this

The only prerequisite is Vagrant. If you don't know about it, please do some research and try it. After cloning the repository, run `vagrant up dev` in the console. Once it's done installing the virtual machine it'll automatically start compiling the app.  After about 10 seconds, you can open the app at `localhost:3000`.

## Project guidelines

* Please check out [the project page](https://waffle.io/ole-vi/planet) for available tasks to work on.
* Before contributing also be sure to read our [style guide](Style-Guide.md)
* Please clone the repository rather than forking, unless you're from outside the organization. It's easier for us to collaborate from a new branch on the same repository.
* After cloning the repository please run `npm run install-hooks` to add the git hooks to your local repository.
* If you see something that needs work, please create an issue.  If the issue is on the frontend, please try to make it specific to one component.
* To work on an issue, create a new branch with a descriptive title.
* Please wait for at least two positive reviews before merging a PR into the master branch


## Unit & end-to-end tests

There are two ways for running the tests.  The first listed works from the host machine, and the second works after `vagrant ssh dev` and `cd /vagrant`:

`npm run v-test` (from host) or `ng test` (from vagrant) - Unit tests
Open `localhost:9876` once this is done compiling

`npm run v-e2e` (from host) or `ng e2e` (from vagrant) - End-to-end tests
Results will appear in the console

## Enabling the Hub

On the production Vagrant there is an optional second Planet instance that can be run to test out "Hub" features.

To start the hub: `npm run hub-on`
The hub will be available at `localhost:3200`

To stop the hub: `npm run hub-off`

To set the hub to automatically start on `vagrant up`, run the following: `npm run hub-boot-on`

To disable autostart run following: `npm run hub-boot-off`

### Additional commands

Similarly, we have a few other npm commands that work from the host machine to run the `ng` commands from the [Angular CLI](https://cli.angular.io/)

`npm run v-serve` = `ng serve`

`npm run v-build` = `ng build`

`npm run v-lint` = `ng lint`

`npm run v-lint-fix` = `ng lint --fix` This will fix any lint errors that TSLint can automatically fix

Also, the `npm start` command can include an additional `LNG` variable to serve from different language files.  This must be run from within the vagrant (so after `vagrant ssh dev` and `cd /vagrant`) and runs in the format:

`LNG=es npm start`

This would serve the app from the Spanish language files.

## Troubleshooting

### I switched branches and now I'm missing a dependency...

The ideal solution would be to ssh into your vagrant and run npm install:

```
vagrant ssh dev
cd /vagrant
npm install
```

This doesn't always work.  If you're having trouble or need to revert to the exact dependencies listed on the package.json, you need to remove all packages then install (after cd /vagrant above, run the commands):

```
sudo rm -rf node_modules/*
sudo npm install --unsafe-perm
```

The trailing `/*` will remove all files & sub-directories of node_modules.  You won't be able to remove node_modules because of the link between the vagrant VM and your host.

### Cannot create new members in development environment or database missing

Sometimes our custom setup for the `_users` database is overwritten by the default or new databases were added in other commits that have not been created in your local environment.  If you are seeing errors with lack of authorization or missing databases, you can run the following command to run our database setup script again:

```
./v-couchdb-setup.sh -u <your admin username> -w <your admin password>
```

### Cannot GET /

There are two things you can try for this.  First is to reinstall the node packages with:

```
vagrant ssh dev
cd /vagrant
sudo rm -rf node_modules/*
rm package-lock.json
sudo npm install --unsafe-perm
```

The second is to rebuild the application.  First you need to cancel the app in the screen with `screen -x` then CTRL-C.  Then you can bring the app back up with one of the above commands or in another screen session with `screen -dmS build bash -c 'cd /vagrant; ng serve'`.

---
This project is tested with [BrowserStack](https://www.browserstack.com/).
