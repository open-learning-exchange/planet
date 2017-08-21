# BeLL apps Angular reboot prototype **Planet**

Project to create a prototype for a reboot of the BeLL apps using Angular4 & CouchDB.

## To work on this

The only prequisite is Vagrant.  After cloning the repository, run `vagrant up` in the console.  Once it's done installing the virtual machine it'll automatically start compiling the app.  After about 10 seconds, you can open the app at `localhost:3000`

## Unit & end-to-end tests

To run testing you will have to first ssh into the virtual machine with `vagrant ssh`, then you can run one of the two commands:

`ng test` - Unit tests
Open `localhost:9876` once this is done compiling

`ng e2e` - End-to-end tests
Open `localhost:49152` once this is done compiling

## Project guidelines

* Please check out [the project page](https://github.com/ole-vi/planet/projects/1) for available tasks to work on.
* If you see something that needs work, please create an issue.  If the issue is on the frontend, please try to make it specific to one component.
* To work on an issue, create a new branch with a descriptive title.
* Please wait for at least two positive reviews before merging a PR into the master branch