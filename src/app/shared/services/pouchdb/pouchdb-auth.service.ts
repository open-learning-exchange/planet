import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';

import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import { environment } from '../../../../environments/environment';
PouchDB.plugin(PouchDBAuth);

import { PouchdbService } from './pouchdb.service';
import { catchError, flatMap, map } from 'rxjs/operators';
import 'rxjs/add/observable/fromPromise';

@Injectable()
export class PouchdbAuthService {
  private baseUrl = environment.couchAddress;
  private authDB;

  constructor(private pouchdbService: PouchdbService) {
    this.authDB = this.pouchdbService.getRemotePouchDB('auth');
  }

  private configureStore(userId: string) {
    this.authDB = new PouchDB(this.baseUrl + '/user-' + window.btoa(userId), {
      skip_setup: true
    });
    this.pouchdbService.updateRemotePouchDB('auth', this.authDB);
  }

  private deconfigureStore() {
    this.authDB = '';
    this.pouchdbService.updateRemotePouchDB('auth', '');
  }

  login(username, password) {
    this.configureStore(username);

    return Observable.fromPromise(this.authDB.login(username, password)).pipe(
      catchError(this.handleError)
    );
  }

  signupUser(username, password, opts?) {
    this.configureStore(name);

    return Observable.fromPromise(
      this.authDB.signUp(username, password, opts)
    ).pipe(catchError(this.handleError));
  }

  private handleError(err) {
    console.error('An error occurred while signing in the user', err);
    this.deconfigureStore();
    return Observable.throw(err.message || err);
  }
}
