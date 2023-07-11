#!/bin/bash

# Set the environment variables
export OPENAI_API_KEY="${OPENAI_API_KEY}"

sed -i -e "s#planet-db-port#$COUCHDB_URL#g" /usr/share/nginx/html/**/main*

# Start the Node.js TypeScript app
node dist/index.js
