[![license: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Docker Stars](https://img.shields.io/docker/stars/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)
[![Docker Pulls](https://img.shields.io/docker/pulls/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)
[![Maintainability](https://qlty.sh/badges/d936229a-e812-4e3a-806e-4f5d7cd4ace5/maintainability.svg)](https://qlty.sh/gh/open-learning-exchange/projects/planet)
[![chat on discord](https://img.shields.io/discord/1079980988421132369?logo=discord&color=%237785cc)](https://discord.gg/BVrFEeNtQZ)

# **Planet Learning**

Planet Learning is a generic learning system built in Angular & CouchDB.

Link to [Angular Doc](https://angular.io/docs) and [Material Design](https://material.angular.io/).

## Planet Development Notes

For development, the following additional tools are required:

* Docker
* Git
* NPM v10
* Node.js v18
* Angular CLI v15

The only other prerequisite is Docker Desktop. After cloning the repository, follow the steps below to set up the development environment using Docker:

Create a directory for planet development data:
```
mkdir -p ~/srv/planetdev && cd ~/srv/planetdev
```

Download the Docker Compose file:
For Linux:
```
wget https://raw.githubusercontent.com/ole-vi/planet-prod-configs/main/planet-dev.yml
```

For macOS/Windows:
```
curl https://gist.githubusercontent.com/xyb994/0d14dfe302df0df0d4e8d8df0d1d5feb/raw/planet-dev-mac.yml -o planet-dev.yml
```

Start the containers:
```
docker compose -f planet-dev.yml -p planet-dev up -d
```

Verify container status:
Run ```docker ps -a``` after a minute. You should see two containers running: chatapi and couchdb. The db-init container should have exited.

Configure CORS for CouchDB:
```
git clone https://github.com/pouchdb/add-cors-to-couchdb.git
cd add-cors-to-couchdb
npm install
while ! curl -X GET http://127.0.0.1:2200/_all_dbs ; do sleep 1; done
node bin.js http://localhost:2200
```

Clone and configure the Planet project:
```
git clone https://github.com/open-learning-exchange/planet.git
cd planet
chmod +x couchdb-setup.sh
bash couchdb-setup.sh -p 2200 -i
```

Install dependencies and serve the app:
```
npm install
ng serve
```

Visit localhost:3000 to access the Planet app.
If port 3000 is in use, try ```ng serve --port 3001```

## Chatapi Notes

Configure the models (API keys & Models & Assistant settings) through the `manager dashboard -> AI Configurations` or directly in the `configurations` database in CouchDB. 

Supported models: *OpenAI*, *Perplexity*, *Deepseek*, and *Gemini*

For chatapi development instructions, refer to the [chatapi README](chatapi/README.md).

## Project Guidelines

* Check out the project page for tasks.
* Before contributing also be sure to read our [style guide](Style-Guide.md).
* Please clone the repository rather than forking, unless you're from outside the organization. It's easier for us to collaborate from a new branch on the same repository.
* After cloning the repository please run `npm run install-hooks` to add the git hooks to your local repository.
* If you see something that needs work, please create an issue.  If the issue is on the frontend, please try to make it specific to one component.
* To work on an issue, create a new branch with a descriptive title.
* Please wait for at least two positive reviews before merging a PR into the master branch

## Locale Configuration

To run planet in development with a different locale, you can set the configuration to one of the supported language tags. For example, to run in Spanish, use:
```
  npm run dev -- --configuration spa 

  or 

  ng serve --configuration spa
```
*You can use the short-hand `-c` in place of `--configuration`*

## Unit & End-to-End Tests

You can run tests directly from the host or within the development container.

### Unit Tests:
```
npm run test
```
Open `localhost:9876` once this is done compiling

### End-to-End Tests:
```
npm run e2e
```
Results will appear in the console

## Additional Commands


Run: `ng serve`

Build: `ng build`

Lint: `ng lint`

This will fix any lint errors that TSLint can automatically fix:
`Fix Lint: ng lint --fix`


## Tracking dependency changes

The previous helper script for checking dependency changes has been removed.
To confirm whether application dependencies have changed, compare
`package.json` against the latest mainline reference:

1. `git fetch origin`
2. `git diff origin/master -- package.json`

If you prefer an install-based check after pulling new changes, run
`npm outdated` to list any packages that differ from what is defined in
`package.json`.


To serve the app in a different language, use the LNG variable:
`
LNG=es npm start
`

## Troubleshooting

### I switched branches and now I'm missing a dependency...

Run the following command to reinstall dependencies:
`
npm install
`

If issues persist, delete and reinstall dependencies:

```
rm -rf node_modules/*
npm install
````

### Missing database or authentication issues

Run the CouchDB setup script:
```
./v-couchdb-setup.sh -u <admin-username> -w <admin-password>
```
### Cannot GET /

Reinstall packages:
```
rm -rf node_modules/*
rm package-lock.json
npm install
```
Restart the app:
`
ng serve
`

### Error on initial npm install

If your npm install fails on your first try, first check if you are using Node v14. Other versions of Node may throw errors when installing dependencies.

This project is tested with [BrowserStack](https://www.browserstack.com/).
