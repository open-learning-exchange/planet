import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { catchError, switchMap, map } from 'rxjs/operators';
import { of, Observable, Subject, forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { addToArray, removeFromArray, dedupeShelfReduce } from './utils';
import { StateService } from './state.service';

// Holds the currently logged in user information
// If available full profile from _users db, if not object in userCtx property of response from a GET _session
// userCtx object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable()
export class UserService {
  private user: any = { name: '' };
  private usersDb = '_users';
  private logsDb = 'login_activities';
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
  currentSession: any;
  userProperties: string[] = [];
  credentials: any;

  // Create an observable for components that need to react to user changes can subscribe to
  private userChange = new Subject<void>();
  userChange$ = this.userChange.asObservable();
  private shelfChange = new Subject<void>();
  shelfChange$ = this.shelfChange.asObservable();
  private notificationStateChange = new Subject<void>();
  notificationStateChange$ = this.notificationStateChange.asObservable();

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

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

  setUserAndShelf(user: any) {
    return this.couchService.findAll('_users').pipe(catchError(() => {
        // If not found in users database, just use userCtx object
        this.user = user;
        return of(false);
      }),
      switchMap((users: any[]) => {
        this.setUserProperties(users);
        const userData = users.find(u => u.name === user.name);
        if (userData) {
          // Remove hashed password information from the data object
          const { derived_key, iterations, password_scheme, salt, ...profile } = userData;
          this.credentials = { derived_key, iterations, password_scheme, salt };
          this.user = profile;
          this.user.roles = [ ...this.user.roles, ...user.roles ].reduce(dedupeShelfReduce, []);
        }
        // Get configuration information next if not in testing environment
        if (!environment.test) {
          return this.getShelf();
        }
        return of({});
      }),
      switchMap((shelf: any) => {
        this.shelf = shelf;
        return of(true);
      }));
  }

  setUserProperties(users) {
    this.userProperties = users.reduce((properties: string[], user: any) => {
      const { derived_key, iterations, password_scheme, salt, ...profile } = user;
      const newProperties = Object.keys(profile);
      return properties.concat(newProperties).reduce(dedupeShelfReduce, [])
        .filter((prop) => [ 'requestId', '_attachments' ].indexOf(prop) === -1);
    }, []);
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
    this.currentSession = undefined;
  }

  logObj(loginTime, logoutTime: any = 0) {
    return Object.assign({
      user: this.user.name,
      type: 'login',
      loginTime,
      logoutTime,
      createdOn: this.stateService.configuration.code,
      parentCode: this.stateService.configuration.parentCode
    }, this.currentSession ? {
      _rev: this.currentSession._rev,
      _id: this.currentSession._id
    } : {});
  }

  // Safeguard to make sure user profile has been set by AuthService
  // before running newSessionLog()
  getNewLogObj() {
    return Observable.create(observer => {
      const timer = setInterval(() => {
        if (this.user.name) {
          observer.next(this.logObj(this.couchService.datePlaceholder));
          observer.complete();
        }
      }, 500);
      return () => { clearInterval(timer); };
    });
  }

  newSessionLog() {
    return this.getNewLogObj().pipe(switchMap(logObj => {
      return this.couchService.updateDocument(this.logsDb, logObj);
    }),
    map((res: any) => {
      this.currentSession = res.doc;
    }));
  }

  endSessionLog() {
    let newObs: Observable<any> = of({});
    if (this.currentSession === undefined) {
      newObs = this.couchService.post(this.logsDb + '/_find', findDocuments(
        { 'user': this.get().name },
        [ '_id', '_rev', 'loginTime' ],
        [ { 'loginTime': 'desc' } ]
      )).pipe(map(data => {
        this.currentSession = data.docs[0];
      }));
    }
    return newObs.pipe(switchMap(() => {
      return this.couchService.updateDocument(this.logsDb, this.logObj(this.currentSession.loginTime, this.couchService.datePlaceholder));
    }), map((res: any) => {
      this.currentSession = res.doc;
      return res;
    }));
  }

  changeShelf(ids: string[], shelfName: string, type: string) {
    const currentIds = this.shelf[shelfName];
    const newIds: string[] = type === 'remove' ? removeFromArray(currentIds, ids) : addToArray(currentIds, ids);
    return this.updateShelf(newIds, shelfName);
  }

  updateShelf(ids: string[], shelfName: string) {
    const countChanged = Math.abs(this.shelf[shelfName].length - ids.length);
    const newShelf = { ...this.shelf, [shelfName]: ids };
    return this.couchService.put('shelf/' + this.user._id, newShelf).pipe(map((res) => {
      this.shelf = { ...newShelf, '_rev': res.rev };
      return { shelf: this.shelf, countChanged };
    }));
  }

  createPin() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  countInShelf(ids: string[], shelfName: string) {
    return ids.reduce((counts: any, id) => {
      const added = this.shelf[shelfName].indexOf(id) > -1 ? 1 : 0;
      return ({
        ...counts,
        inShelf: counts.inShelf + added,
        notInShelf: counts.notInShelf + Math.abs(added - 1)
      });
    }, { inShelf: 0, notInShelf: 0 });
  }

  updateUser(userInfo) {
    const planetConfiguration = this.stateService.configuration;
    const newUserInfo = { ...userInfo, roles: userInfo.roles.filter(role => role.indexOf('_') === -1) };
    // ...is the rest syntax for object destructuring
    return this.couchService.put(this.usersDb + '/org.couchdb.user:' + userInfo.name, { ...newUserInfo })
    .pipe(
      switchMap(res => {
        userInfo._rev = res.rev;
        if (userInfo.name === this.get().name) {
          const { derived_key, iterations, password_scheme, salt, ...profile } = userInfo;
          this.set(profile);
        }
        if (planetConfiguration.adminName === userInfo.name + '@' + planetConfiguration.code) {
          return this.updateConfigurationContact(userInfo, planetConfiguration);
        }
        return of({ ok: true });
      })
    );
  }

  updateConfigurationContact(userInfo, planetConfiguration) {
    const { firstName, lastName, middleName, email, phoneNumber, ...otherInfo } = userInfo;
    const newConfig = { ...planetConfiguration, firstName, lastName, middleName, email, phoneNumber };
    return this.couchService.put('configurations/' + planetConfiguration._id, newConfig)
    .pipe(map((res) => {
      this.stateService.requestData('configurations', 'local');
      return res;
    }));
  }

}
