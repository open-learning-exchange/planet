import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { catchError, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { findDocuments } from '../shared/mangoQueries';

// Holds the currently logged in user information
// If available full profile from _users db, if not object in userCtx property of response from a GET _session
// userCtx object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable()
export class UserService {

  private user: any = { name: '' };
  private logsDb = 'login_activities';
  sessionStart: number;
  sessionRev: string;
  sessionId: string;

  constructor(private couchService: CouchService) {}

  set(user: any): any {
    this.user = user;
  }

  get(): any {
    return this.user;
  }

  setProfile(user: any) {
    return this.couchService.get('_users/org.couchdb.user:' + user.name).pipe(catchError(() => {
        // If not found in users database, just use userCtx object
        this.user = user;
        return of(false);
      }),
      switchMap((data) => {
        if (data) {
          // Remove hashed password information from the data object
          const { derived_key, iterations, password_scheme, salt, ...profile } = data;
          this.user = profile;
        }
        return of(true);
      }));
  }

  unset(): any {
    this.user = { name: '' };
  }

  logObj(logoutTime: number = 0) {
    return Object.assign({
      user: this.user.name,
      type: 'login',
      login_time: this.sessionStart,
      logout_time: logoutTime,
    }, this.sessionRev ? {
      _rev: this.sessionRev
    } : {});
  }

  newSessionLog() {
    this.sessionStart = Date.now();
    return this.couchService.post(this.logsDb, this.logObj()).pipe(map(res => {
      this.sessionRev = res.rev;
      this.sessionId = res.id;
    }));
  }

  endSessionLog() {
    if (this.sessionId === undefined) {
      return this.couchService.post(this.logsDb + '/_find', findDocuments(
              { 'user': this.get().name },
              [ '_id', '_rev', 'login_time' ],
              [ { 'login_time': 'desc' } ]
            )).pipe(switchMap(data => {
              console.log('Data' , data);
              this.sessionId =  data.docs[0]['_id'];
              this.sessionRev =  data.docs[0]['_rev'];
              this.sessionStart =  data.docs[0]['login_time'];
              return this.couchService.put(this.logsDb + '/' + this.sessionId, this.logObj(Date.now()));
            }));
    } else {
      return this.couchService.put(this.logsDb + '/' + this.sessionId, this.logObj(Date.now()));
    }
  }

}
