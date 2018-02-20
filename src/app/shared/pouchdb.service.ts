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

  constructor() {
    this.localDb = null;
    this.remoteDb = null;
  }

  // call deconfigureStore whenever new user is signed in to configure a new db for the user and end the previous user's session
  async configureStore(userId: string) {
    await this.deconfigureStore();

    this.localDb = new PouchDB('planet-local');
    this.remoteDb = new PouchDB(this.baseUrl + '/' + userId, {
      skip_setup: true
    });

    this.localDb
      .sync('planet-local', { live: true, retry: true })
      .on('error', console.log.bind(console));
  }

  getDb() {
    if (!this.localDb) {
      throw new Error('Database has not yet been configured!');
    }

    return this.localDb;
  }

  async deconfigureStore() {
    if (!this.localDb) {
      return;
    }

    await this.localDb.close();
    this.localDb = null;

    await this.remoteDb.close();
    this.remoteDb = null;
  }
}
