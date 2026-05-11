import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const couchUrl = process.env.COUCHDB_HOST;
const couchUser = process.env.COUCHDB_USER;
const couchPass = process.env.COUCHDB_PASS;

const couchHost = couchUser && couchPass
  ? `http://${couchUser}:${couchPass}@${(couchUrl || 'http://couchdb:5984').replace('http://', '')}`
  : (couchUrl || 'http://couchdb:5984');

const db = nano(couchHost);
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');
const examsDB = db.use('exams');
const submissionsDB = db.use('submissions');
const teamsDB = db.use('teams');

export { chatDB, configurationDB, examsDB, resourceDB, submissionsDB, teamsDB };
