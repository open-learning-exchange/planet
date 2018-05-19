import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import PouchDBFind from 'pouchdb-find';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromEvent';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

PouchDB.plugin(PouchDBAuth);
PouchDB.plugin(PouchDBFind);

type RemoteDatabases = 'courses';

@Injectable()
export class PouchDBService {
  private baseUrl = environment.couchAddress;
  private localDB;
  private authDB;
  private remoteDBs = {
    courses: null
  };
  private courses;

  constructor() {
    this.localDB = new PouchDB('local-pouchdb');

    // indexes the field for faster lookup
    this.localDB.createIndex({
      index: {
        fields: ['kind', 'createdAt']
      }
    });

    // test is a placeholder temp database
    // we need a central remote database
    // since we will have different levels of authentication (manager, intern)
    // we will have to create corresponding documents in couchdb and we can sync
    // we can decide that when the user is being created for the first time?
    this.authDB = new PouchDB(this.baseUrl + 'courses', {
      skip_setup: true
    });

    this.remoteDBs.courses = new PouchDB(this.baseUrl + 'courses');

    this.localDB
      .sync(this.authDB, { live: true, retry: true })
      .on('error', console.log.bind(console));
  }

  replicateRemoteToLocal(key: RemoteDatabases) {
    return Observable.fromPromise(
      this.localDB.replicate.from(this.remoteDBs[key])
    ).pipe(catchError(this.handleError));
  }

  getLocalPouchDB() {
    return this.localDB;
  }

  getAuthDB() {
    return this.authDB;
  }

  getRemotePouchDB(key: RemoteDatabases) {
    return this.remoteDBs[key];
  }

  updateRemotePouchDB(key: RemoteDatabases, updatedDatabase) {
    this.remoteDBs[key] = updatedDatabase;
  }

  private handleError(err) {
    console.error('An error occurred replicating from the database', err);
    return Observable.throw(err.message || err);
  }
}
