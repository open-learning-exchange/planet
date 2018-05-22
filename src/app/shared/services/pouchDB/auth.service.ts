import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PouchDBService } from './pouchDB.service';

interface SessionInfo {
  userCtx: {
    name: String;
    roles: String[];
  };
}
@Injectable()
export class AuthService {
  private authDB;

  constructor(private pouchdbService: PouchDBService) {
    this.authDB = this.pouchdbService.getAuthDB();
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
    return Observable.throw(err.message || err);
  }
}
