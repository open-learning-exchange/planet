# BeLL apps Angular reboot prototype **Planet**

Project to create a prototype for a reboot of the BeLL apps using Angular5 & CouchDB2.

## To work on this

The only prerequisite is Vagrant. If you don't know about it, please do some research and try it. After cloning the repository, run `vagrant up` in the console. Once it's done installing the virtual machine it'll automatically start compiling the app.  After about 10 seconds, you can open the app at `localhost:3000`.

## Project guidelines

* Please check out [the project page](https://waffle.io/ole-vi/planet) for available tasks to work on.
* Before contributing also be sure to read our [style guide](Style-Guide.md)
* Please clone the repository rather than forking, unless you're from outside the organization. It's easier for us to collaborate from a new branch on the same repository.
* After cloning the repository please run `npm run install-hooks` to add the git hooks to your local repository.
* If you see something that needs work, please create an issue.  If the issue is on the frontend, please try to make it specific to one component.
* To work on an issue, create a new branch with a descriptive title.
* Please wait for at least two positive reviews before merging a PR into the master branch


## Unit & end-to-end tests

There are two ways for running the tests.  The first listed works from the host machine, and the second works after `vagrant ssh` and `cd /vagrant`:

`npm run v-test` (from host) or `ng test` (from vagrant) - Unit tests
Open `localhost:9876` once this is done compiling

`npm run v-e2e` (from host) or `ng e2e` (from vagrant) - End-to-end tests
Results will appear in the console

### Additional commands

Similarly, we have a few other npm commands that work from the host machine to run the `ng` commands from the [Angular CLI](https://cli.angular.io/)

`npm run v-serve` = `ng serve`

`npm run v-build` = `ng build`

`npm run v-lint` = `ng lint`

`npm run v-lint-fix` = `ng lint --fix` This will fix any lint errors that TSLint can automatically fix

Also, the `npm start` command can include an additional `LNG` variable to serve from different language files.  This must be run from within the vagrant (so after `vagrant ssh` and `cd /vagrant`) and runs in the format:

`LNG=es npm start`

This would serve the app from the Spanish language files.
