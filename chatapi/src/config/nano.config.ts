import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const db = nano(process.env.COUCHDB_HOST || 'http://couchdb:5984');
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');

export { chatDB, resourceDB, configurationDB };
