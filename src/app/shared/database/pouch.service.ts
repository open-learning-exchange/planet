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
  private localDB;
  private remoteDBs = [];

  constructor() {
    this.localDB = new PouchDB('local-pouchdb');

    // indexes the field for faster lookup
    this.localDB.createIndex({
      index: {
        fields: [ 'kind', 'createdAt' ]
      }
    });
  }

  // @TODO: handle edge cases like offline, duplicate, duplications
  // handle repliction errors or make use of navigator online?
  replicateFromRemoteDBs() {
    return this.remoteDBs.forEach(db => {
      this.localDB.replicate.from(this.baseUrl + db);
    });
  }

  replicateToRemoteDBs() {
    return this.remoteDBs.forEach(db => {
      this.localDB.replicate.to(this.baseUrl + db, {
        filter(doc) {
          return doc.pouchIndex === db;
        }
      });
    });
  }

  replicateFromRemoteDB(db) {
    return from(
      this.localDB.replicate.from(this.baseUrl + db)
    ).pipe(catchError(this.handleError));
  }

  replicateToRemoteDB(db) {
    return from(
      this.localDB.replicate.to(this.baseUrl + db)
    ).pipe(catchError(this.handleError));
  }

  getLocalPouchDB() {
    return this.localDB;
  }

  private handleError(err) {
    console.error('An error occurred in PouchDB', err);
    return throwError(err.message || err);
  }
}
