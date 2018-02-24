import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import { environment } from '../../environments/environment';
PouchDB.plugin(PouchDBAuth);
// WHAT ARE WE TRYING TO DO ?
// Create a database per new user sign up
// Remember this is NoSQL not SQL
// @TODO: Use a different method to configure the remote db in the app or login component
// @FIXME: Probably will have to create multiple instances of remotedb to handle all different databases

@Injectable()
export class PouchdbService {
  private baseUrl = environment.couchAddress;
  private remoteDb: any; // we use remote db for authentication and stuff!!
  private localDb: any;

  constructor() {
    this.localDb = null;
    this.remoteDb = null;
  }

  // call deconfigureStore whenever new user is signed in to configure a new db for the user and end the previous user's session
  async configureStore(userId: string) {
    await this.deconfigureStore();

    this.localDb = new PouchDB('planet-local');
    this.remoteDb = new PouchDB(this.baseUrl + '/user-' + window.btoa(userId), {
      skip_setup: true
    });
  }

  getLocalDb() {
    if (!this.localDb) {
      throw new Error('Database has not yet been configured!');
    }

    return this.localDb;
  }

  getRemoteDb() {
    if (!this.remoteDb) {
      throw new Error('Database has not yet been configured!');
    }

    return this.remoteDb;
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

  // @FIXME: move to user services
  // @TODO: rewrite with Observables
  async login(name, password) {
    await this.configureStore(name);

    const ajaxOpts = {
      ajax: {
        headers: {
          Authorization: 'Basic ' + window.btoa(name + ':' + password)
        }
      }
    };

    await this.remoteDb.login(name, password).catch(error => {
      this.deconfigureStore();
      console.error(error);
    });
  }
  async signupUser(name, password) {
    await this.configureStore(name);

    await this.remoteDb
      .signUp(name, password)
      .then(function() {
        // So it seems that we first need to login to the remotedb otherwise we get a 400 error about the http adapters
        this.remoteDb.login(name, password).then(() => {
          this.localDb
            .sync(this.remoteDb, { live: true, retry: true })
            .on('error', console.log.bind(console));
        });
        this.login(name, password);
      })
      .catch(err => {
        this.deconfigureStore();
        if (err) {
          if (err.name === 'conflict') {
            // "batman" already exists, choose another username
          } else if (err.name === 'forbidden') {
            // invalid username
          } else {
            // HTTP error, cosmic rays, etc.
          }
        }
      });
  }
}
