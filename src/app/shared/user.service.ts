import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { catchError, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { findDocuments } from '../shared/mangoQueries';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';

// Holds the currently logged in user information
// If available full profile from _users db, if not object in userCtx property of response from a GET _session
// userCtx object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable()
export class UserService {
  private user: any = { name: '' };
  private logsDb = 'login_activities';
  private configuration: any = { };
  sessionStart: number;
  sessionRev: string;
  sessionId: string;

  // Create an observable for components that need to react to user changes can subscribe to
  private userChange = new Subject<void>();
  userChange$ = this.userChange.asObservable();

  constructor(private couchService: CouchService) {}

  set(user: any): any {
    this.user = user;
    this.userChange.next();
  }

  get(): any {
    return this.user;
  }

  getConfig(): any {
    return this.configuration;
  }

  setUserAndConfig(user: any) {
    return this.couchService.get('_users/org.couchdb.user:' + user.name).pipe(catchError(() => {
        // If not found in users database, just use userCtx object
        this.user = user;
        return of(false);
      }),
      switchMap((userData) => {
        if (userData) {
          // Remove hashed password information from the data object
          const { derived_key, iterations, password_scheme, salt, ...profile } = userData;
          this.user = profile;
        }
        // Get configuration information next if not in testing environment
        if (!environment.test) {
          return this.couchService.allDocs('configurations');
        }
        return of(false);
      }),
      switchMap((configData) => {
        if (configData) {
          this.configuration = configData[0];
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
      loginTime: this.sessionStart,
      logoutTime: logoutTime,
    }, this.sessionRev ? {
      _rev: this.sessionRev
    } : {});
  }

  // Safeguard to make sure user profile has been set by AuthService
  // before running newSessionLog()
  getNewLogObj() {
    return Observable.create(observer => {
      const timer = setInterval(() => {
        if (this.user.name) {
          observer.next(this.logObj());
          observer.complete();
        }
      }, 500);
      return () => { clearInterval(timer); };
    });
  }

  newSessionLog() {
    this.sessionStart = Date.now();
    return this.getNewLogObj().pipe(switchMap(logObj => {
      return this.couchService.post(this.logsDb, this.logObj());
    }),
    map((res: any) => {
      this.sessionRev = res.rev;
      this.sessionId = res.id;
    }));
  }

  endSessionLog() {
    let newObs: Observable<any> = of({});
    if (this.sessionId === undefined) {
      newObs = this.couchService.post(this.logsDb + '/_find', findDocuments(
        { 'user': this.get().name },
        [ '_id', '_rev', 'loginTime' ],
        [ { 'loginTime': 'desc' } ]
      )).pipe(map(data => {
        this.sessionId = data.docs[0]['_id'];
        this.sessionRev = data.docs[0]['_rev'];
        this.sessionStart = data.docs[0]['loginTime'];
      }));
    }
    return newObs.pipe(switchMap(() => {
      return this.couchService.put(this.logsDb + '/' + this.sessionId, this.logObj(Date.now()));
    }));
  }

}
