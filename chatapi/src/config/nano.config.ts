import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const db = nano(process.env.COUCHDB_HOST || 'http://couchdb:5984').use('chat_history');

export default db;
