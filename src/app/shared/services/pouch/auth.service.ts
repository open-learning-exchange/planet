import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { catchError } from 'rxjs/operators';
import { PouchService } from './pouch.service';
import 'rxjs/add/observable/fromPromise';

interface SessionInfo {
  userCtx: {
    name: String;
    roles: String[];
  };
}

@Injectable()
export class AuthService {
  private authDB;

  constructor(private pouchdbService: PouchService) {
    this.authDB = this.pouchdbService.getRemotePouchDB('auth');
  }

  getSessionInfo(): Observable<SessionInfo> {
    return Observable.fromPromise(this.authDB.getSession()).pipe(
      catchError(this.handleError)
    );
  }

  login(username, password) {
    return Observable.fromPromise(this.authDB.login(username, password)).pipe(
      catchError(this.handleError)
    );
  }

  signupUser(username, password, opts?) {
    return Observable.fromPromise(
      this.authDB.signUp(username, password, opts)
    ).pipe(catchError(this.handleError));
  }

  private handleError(err) {
    console.error('An error occurred while signing in the user', err);
    return ErrorObservable.create(err.message || err);
  }
}
