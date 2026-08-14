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

const stripUrlCredentials = (url: string) => {
  const parsedUrl = new URL(url);
  parsedUrl.username = '';
  parsedUrl.password = '';
  return parsedUrl.toString().replace(/\/$/, '');
};

/** CouchDB base URL without embedded credentials for session validation. */
const couchBaseUrl = stripUrlCredentials(couchUrl || defaultCouchUrl);

const couchHost = couchUser && couchPass
  ? withCredentials(couchUrl || defaultCouchUrl, couchUser, couchPass)
  : (couchUrl || defaultCouchUrl);

const db = nano(couchHost);
const chatDB = db.use('chat_history');
const configurationDB = db.use('configurations');
const examsDB = db.use('exams');
const submissionsDB = db.use('submissions');
const teamsDB = db.use('teams');
const resourceIndexStatePrefix = '_local/chatapi-resource-index-';

/** Options supported by Nano at runtime but missing from its v10 RequestOptions type. */
type ResourceRequestOptions = nano.RequestOptions & {
  signal?: AbortSignal;
  dontParse?: boolean;
};

/** Run a resource-database request that can be cancelled with its owning operation. */
const requestResourceDatabase = (options: ResourceRequestOptions) => db.request({
  ...options,
  'db': 'resources'
} as nano.RequestOptions);

/** List deployment-local resource metadata, which CouchDB omits from `_all_docs`. */
const listResourceLocalDocs = () => db.request({
  'db': 'resources',
  'path': '_local_docs',
  'qs': {
    'include_docs': true,
    'startkey': resourceIndexStatePrefix,
    'endkey': `${resourceIndexStatePrefix}\ufff0`
  }
});

export {
  chatDB,
  configurationDB,
  couchBaseUrl,
  examsDB,
  listResourceLocalDocs,
  requestResourceDatabase,
  submissionsDB,
  teamsDB
};
