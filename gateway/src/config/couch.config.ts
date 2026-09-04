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

const couchHost = couchUser && couchPass
  ? withCredentials(couchUrl || defaultCouchUrl, couchUser, couchPass)
  : (couchUrl || defaultCouchUrl);

const db = nano(couchHost);
const adminActivitiesDB = db.use<any>('admin_activities');
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');
const examsDB = db.use('exams');
const replicatorDB = db.use<any>('_replicator');
const submissionsDB = db.use('submissions');
const teamsDB = db.use('teams');

export { adminActivitiesDB, chatDB, configurationDB, examsDB, replicatorDB, resourceDB, submissionsDB, teamsDB };
