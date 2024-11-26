import { Injectable } from '@angular/core';
import { from, throwError, Observable, forkJoin } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PouchService } from './pouch.service';
import { CouchService } from '../couchdb.service';
import { UserChallengeStatusService } from '../user-challenge-status.service';

interface SessionInfo {
  userCtx: {
    name: String;
    roles: String[];
  };
}
@Injectable({
  providedIn: 'root'
})
export class PouchAuthService {
  private authDB;

  constructor(
    private pouchService: PouchService,
    private couchService: CouchService,
    private userStatusService: UserChallengeStatusService
  ) {
    this.authDB = this.pouchService.getAuthDB();
  }

  getSessionInfo(): Observable<SessionInfo> {
    return from(this.authDB.getSession()).pipe(
      catchError(this.handleError)
    ) as Observable<SessionInfo>;
  }

  login(username, password) {
    this.pouchService.configureDBs();
    return from(this.authDB.logIn(username, password)).pipe(
      catchError(this.handleError)
    );
  }

  signup(username, password, opts = {}) {
    return this.couchService.currentTime().pipe(
      switchMap((date) => from(this.authDB.signUp(username, password, this.couchService.fillInDateFields(opts, date)))),
      catchError(this.handleError)
    );
  }

  logout() {
    this.userStatusService.resetStatus();
    return from(this.authDB.logOut()).pipe(
      switchMap(() => forkJoin(this.pouchService.deconfigureDBs())),
      catchError(this.handleError)
    );
  }

  private handleError(err) {
    console.error('An error occured while signing in the user', err);
    return throwError(err.message || err);
  }
}
