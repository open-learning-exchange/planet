import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import PouchDBFind from 'pouchdb-find';
import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import 'rxjs/add/observable/fromPromise';

PouchDB.plugin(PouchDBAuth);
PouchDB.plugin(PouchDBFind);

type RemoteDatabases = 'auth' | 'courses';

@Injectable()
export class PouchService {
  private baseUrl = environment.couchAddress;
  private localDB;
  private authDB;
  private readonly remoteDBs = [ 'courses' ];

  constructor() {
    this.localDB = new PouchDB('local-pouchdb');

    // indexes the field for faster lookup
    this.localDB.createIndex({
      index: {
        fields: [ 'pouchIndex', 'createdDate' ]
      }
    });

    // test is a placeholder temp database
    // we need a central remote database
    // since we will have different levels of authentication (manager, intern)
    // we will have to create corresponding documents in couchdb and we can sync
    // we can decide that when the user is being created for the first time?
    this.authDB = new PouchDB(this.baseUrl + 'test', {
      skip_setup: true
    });
  }

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

  replicateFromRemoteDB(key: RemoteDatabases) {
    return Observable.fromPromise(
      this.localDB.replicate.from(this.baseUrl + key)
    ).pipe(catchError(this.handleError));
  }

  // @TODO: handle offline cases
  // handle error or make use of navigator online?
  replicateToRemoteDB(key: RemoteDatabases) {
    return Observable.fromPromise(
      this.localDB.replicate.to(this.baseUrl + key)
    ).pipe(catchError(this.handleError));
  }

  getLocalPouchDB() {
    return this.localDB;
  }

  getAuthDB() {
    return this.authDB;
  }

  private handleError(err) {
    console.error('An error occurred replicating from the database', err);
    return ErrorObservable.create(err.message || err);
  }
}
