[![Maintainability](https://api.codeclimate.com/v1/badges/028682cc4cd969b05280/maintainability)](https://codeclimate.com/github/open-learning-exchange/planet/maintainability)
[![Build Status](https://travis-ci.org/open-learning-exchange/planet.svg?branch=master)](https://travis-ci.org/open-learning-exchange/planet)
[![Docker Stars](https://img.shields.io/docker/stars/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)
[![Docker Pulls](https://img.shields.io/docker/pulls/treehouses/planet.svg?maxAge=604800)](https://store.docker.com/community/images/treehouses/planet)


# **Planet Learning**

Planet Learning is a generic learning system built in Angular & CouchDB.

Link to [Angular Doc](https://angular.io/docs) and [Material Design](https://material.angular.io/).

## To work on this

The only prerequisite is Docker Desktop. After cloning the repository, follow the steps below to set up the development environment using Docker:

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
```git clone https://github.com/pouchdb/add-cors-to-couchdb.git
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

## Project Guidelines

Check out the project page for tasks.
Review the style guide.
Clone the repository to collaborate from a shared branch.
Run npm run install-hooks after cloning to add Git hooks.
Report issues, especially with specific frontend components.
Create a new branch with a descriptive name to work on issues.
Wait for two positive reviews before merging into master.

## Unit & End-to-End Tests

You can run tests directly from the host or within the development container.

  Unit Tests:
  ```
    npm run test
```
  End-to-End Tests:
```
    npm run e2e
````

## Additional Commands
```
    Run: ng serve
    Build: ng build
    Lint: ng lint
    Fix Lint: ng lint --fix
```

To serve the app in a different language, use the LNG variable:
```
LNG=es npm start
```

## Troubleshooting
### I switched branches and now I'm missing a dependency...

Run the following command to reinstall dependencies:
```
npm install
```

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
```
    ng serve
```

This project is tested with [BrowserStack](https://www.browserstack.com/).
