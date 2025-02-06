[![Maintainability](https://api.codeclimate.com/v1/badges/028682cc4cd969b05280/maintainability)](https://codeclimate.com/github/open-learning-exchange/planet/maintainability)
[![Build Status](https://travis-ci.org/open-learning-exchange/planet.svg?branch=master)](https://travis-ci.org/open-learning-exchange/planet)
[![Docker Stars](https://img.shields.io/docker/stars/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)
[![Docker Pulls](https://img.shields.io/docker/pulls/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)


# **Planet Learning**

Planet Learning is a generic learning system built in Angular & CouchDB.

Link to [Angular Doc](https://angular.io/docs) and [Material Design](https://material.angular.io/).

## Planet Development Notes

For development, the following additional tools are required:

* Docker
* Git
* NPM v6
* Node.js v14
* Angular CLI v10

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

## Chatapi Development Notes

Run `cd chatapi` and add a .env file in the `chatapi` directory with the following configs in the .env file(change the username and password to your CouchDB admin credentials):
  ```
    SERVE_PORT=5000
    COUCHDB_HOST=http://localhost:2200
    COUCHDB_USER=username
    COUCHDB_PASS=password
  ```

Configure the models(API keys & Models & Assistant settings) through the `manager dashboard -> AI Configurations` or in the `configurations` database directly in CouchDB. Currently we support *OpenAI*, *Perplexity*, *Deepseek*, and *Gemini* models.

**Note:** The dev chatapi runs on port 5000 similar to the production environment. Therefore, only one of them can run at a time. To deactivate the production chatapi run `docker stop planet_chatapi_1(or container id)`

To run the chatapi locally, you need to use node v18. You can use nvm(linux) or fnm(windows/macos) to manage your node versions. To start the chatapi:
```
  npm install
  nvm use 18
  npm run dev
```

## Project Guidelines

* Check out the project page for tasks.
* Before contributing also be sure to read our [style guide](Style-Guide.md).
* Please clone the repository rather than forking, unless you're from outside the organization. It's easier for us to collaborate from a new branch on the same repository.
* After cloning the repository please run `npm run install-hooks` to add the git hooks to your local repository.
* If you see something that needs work, please create an issue.  If the issue is on the frontend, please try to make it specific to one component.
* To work on an issue, create a new branch with a descriptive title.
* Please wait for at least two positive reviews before merging a PR into the master branch

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

### Mime.getType does not exist (Windows)
Use Mime 3.0.0
```
npm i mime@3.0.0
npm i @types/mime@3.0.0
```

### Error on initial npm install

If your npm install fails on your first try, first check if you are using Node v14. Other versions of Node may throw errors when installing dependencies.

### Fatal error in chatapi using an arm32 device

If you are using an 32bit arm device and encounter a fatal error while running the chatapi container run the following:
```
  wget http://ftp.us.debian.org/debian/pool/main/libs/libseccomp/libseccomp2_2.5.1-1~bpo10+1_armhf.deb

  dpkg -i libseccomp2_2.5.1-1~bpo10+1_armhf.deb
```

This project is tested with [BrowserStack](https://www.browserstack.com/).
