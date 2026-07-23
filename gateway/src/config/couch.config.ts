import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const couchUrl = process.env.COUCHDB_HOST;
const couchUser = process.env.COUCHDB_USER;
const couchPass = process.env.COUCHDB_PASS;
const defaultCouchUrl = 'http://couchdb:5984';

const withCredentials = (url: string, user: string, pass: string) => {
  const parsedUrl = new URL(url);
  parsedUrl.username = user;
  parsedUrl.password = pass;
  return parsedUrl.toString().replace(/\/$/, '');
};

/** CouchDB base URL without embedded credentials (fetch() rejects credentialed URLs). */
const couchBaseUrl = (couchUrl || defaultCouchUrl).replace(/\/$/, '');

const couchHost = couchUser && couchPass
  ? withCredentials(couchUrl || defaultCouchUrl, couchUser, couchPass)
  : (couchUrl || defaultCouchUrl);

const db = nano(couchHost);
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');
const examsDB = db.use('exams');
const submissionsDB = db.use('submissions');
const teamsDB = db.use('teams');

export { chatDB, configurationDB, couchBaseUrl, examsDB, resourceDB, submissionsDB, teamsDB };
