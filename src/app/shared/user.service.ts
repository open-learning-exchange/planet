import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { map } from 'rxjs/operators';

// Holds the currently logged in user information (object in userCtx property of response from a GET _session)
// User object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable()
export class UserService {

  private user: any;
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

  unset(): any {
    this.user = {};
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
    return this.couchService.put(this.logsDb + '/' + this.sessionId, this.logObj(Date.now()));
  }

}
