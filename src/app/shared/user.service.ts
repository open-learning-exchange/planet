import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { catchError, switchMap, map } from 'rxjs/operators';
import { of, Observable, Subject, forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { addToArray, removeFromArray } from './utils';

// Holds the currently logged in user information
// If available full profile from _users db, if not object in userCtx property of response from a GET _session
// userCtx object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable()
export class UserService {
  private user: any = { name: '' };
  private logsDb = 'login_activities';
  private configuration: any = { };
  private _shelf: any = { };
  get shelf(): any {
    return this._shelf;
  }
  set shelf(shelf: any) {
    this._shelf = shelf;
    if (Object.keys(shelf).length > 0) {
      this.shelfChange.next(shelf);
    }
  }
  sessionStart: number;
  sessionRev: string;
  sessionId: string;
  userProperties: string[] = [];

  // Create an observable for components that need to react to user changes can subscribe to
  private userChange = new Subject<void>();
  userChange$ = this.userChange.asObservable();
  private shelfChange = new Subject<void>();
  shelfChange$ = this.shelfChange.asObservable();
  private notificationStateChange = new Subject<void>();
  notificationStateChange$ = this.notificationStateChange.asObservable();

  constructor(private couchService: CouchService) {}

  set(user: any): any {
    this.user = user;
    this.userChange.next();
  }

  setNotificationStateChange() {
    this.notificationStateChange.next();
  }

  get(): any {
    return this.user;
  }

  getConfig(): any {
    return this.configuration;
  }

  setConfig(config) {
    this.configuration = config;
  }

  setUserConfigAndShelf(user: any) {
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
          this.userProperties = Object.keys(profile);
        }
        // Get configuration information next if not in testing environment
        if (!environment.test) {
          return forkJoin([
            this.couchService.allDocs('configurations'),
            this.getShelf()
          ]);
        }
        return of([ [], {} ]);
      }),
      switchMap(([ configuration, shelf ]: [ any, any ]) => {
        if (configuration.length > 0) {
          this.configuration = configuration[0];
          this.shelf = shelf;
        }
        return of(true);
      }));
  }

  getShelf() {
    return this.couchService.post(`shelf/_find`, { 'selector': { '_id': this.user._id } })
      .pipe(
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", so send empty object
        catchError(err => {
          // Observable of continues stream
          return of({ docs: [ {} ] });
        }),
        // Combine with empty shelf in case all fields are not present
        map(data => {
          return Object.assign({ meetupIds: [], resourceIds: [], courseIds: [], myTeamIds: [] }, data.docs[0]);
        })
      );
  }

  unset(): any {
    this.user = { name: '' };
    this.shelf = {};
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
    }), map((res: any) => {
      this.sessionRev = res.rev;
      return res;
    }));
  }

  changeShelf(ids: string[], shelfName: string, type: string) {
    const currentIds = this.shelf[shelfName];
    const newIds: string[] = type === 'remove' ? removeFromArray(currentIds, ids) : addToArray(currentIds, ids);
    return this.updateShelf(newIds, shelfName);
  }

  updateShelf(ids: string[], shelfName: string) {
    const newShelf = { ...this.shelf, [shelfName]: ids };
    return this.couchService.put('shelf/' + this.user._id, newShelf).pipe(map((res) => {
      this.shelf = { ...newShelf, '_rev': res.rev };
      return this.shelf;
    }));
  }

  createPin() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

}
