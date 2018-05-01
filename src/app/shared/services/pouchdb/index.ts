import { PouchdbService } from './pouchdb.service';
import { PouchdbAuthService } from './pouchdb-auth.service';

export { PouchdbService } from './pouchdb.service';
export { PouchdbAuthService } from './pouchdb-auth.service';

export const SHARED_SERVICES = [PouchdbService, PouchdbAuthService];
