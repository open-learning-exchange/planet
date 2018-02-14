import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import { environment } from '../../environments/environment';
PouchDB.plugin(require('pouchdb-authentication'));
// WHAT ARE WE TRYING TO DO ?
// Create a database per new user sign up
// Remember this is NoSQL not SQL
// @TODO: Use a different method to configure the remote db in the app or login component
// @FIXME: Probably will have to create multiple instances of remotedb to handle all different databases

@Injectable()
export class PouchdbService {
  private baseUrl = environment.couchAddress;
  private remoteDb: any;
  private localDb: any;

  constructor() {}

  public configureStore() {
    this.localDb = new PouchDB('planet-local');
  }
}
