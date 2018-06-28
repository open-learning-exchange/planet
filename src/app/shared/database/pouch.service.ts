import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import { throwError, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

PouchDB.plugin(PouchDBFind);

@Injectable()
export class PouchService {
  private baseUrl = environment.couchAddress;
  private localDBs;
  private databases = [];

  constructor() {
    this.databases.forEach(db => {
      const pouchDB = new PouchDB(`local-${db}`);

      // indexes the field for faster lookup
      pouchDB.createIndex({
        index: {
          fields: [ 'kind', 'createdAt' ]
        }
      });
      this.localDBs[db] = pouchDB;
    });
  }

  // @TODO: handle edge cases like offline, duplicate, duplications
  // handle repliction errors or make use of navigator online?
  replicateFromRemoteDBs() {
    this.databases.forEach(db => {
      this.localDBs[db].replicate.from(this.baseUrl + db);
    });
  }

  replicateToRemoteDBs() {
    this.databases.forEach(db => {
      this.localDBs[db].replicate.to(this.baseUrl + db, {
        filter(doc) {
          return doc.pouchIndex === db;
        }
      });
    });
  }

  replicateFromRemoteDB(db) {
    return this.replicate(this.localDBs[db].replicate.from(this.baseUrl + db));
  }

  replicateToRemoteDB(db) {
    return this.replicate(this.localDBs[db].replicate.to(this.baseUrl + db));
  }

  replicate(replicateFn) {
    return from(replicateFn).pipe(catchError(this.handleError));
  }

  getLocalPouchDB(db) {
    return this.localDBs[db];
  }

  private handleError(err) {
    console.error('An error occurred in PouchDB', err);
    return throwError(err.message || err);
  }
}
