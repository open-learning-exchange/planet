import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import { environment } from '../../../../environments/environment';

type RemoteDatabases = 'auth';

@Injectable()
export class PouchdbService {
  private baseUrl = environment.couchAddress;
  private localDb;
  private remoteDbs = {
    auth: ''
  };

  constructor() {
    this.localDb = new PouchDB('local-pouchdb');
  }

  getLocalPouchDB() {
    return this.localDb;
  }

  getRemotePouchDB(key: RemoteDatabases) {
    return this.remoteDbs[key];
  }

  updateRemotePouchDB(key: RemoteDatabases, updatedDatabase) {
    this.remoteDbs[key] = updatedDatabase;
  }
}
