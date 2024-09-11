import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const couchUrl = `${process.env.COUCHDB_HOST}`;
const couchUser = process.env.COUCHDB_USER;
const couchPass = process.env.COUCHDB_PASS;

// Construct full CouchDB URL with credentials if they exist
const couchHost = couchUser && couchPass
  ? `http://${couchUser}:${couchPass}@${couchUrl.replace('http://', '')}`
  : couchUrl;

const db = nano(couchHost || 'http://couchdb:5984');
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');

export { chatDB, resourceDB, configurationDB };
