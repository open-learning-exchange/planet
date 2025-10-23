import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { catchError, switchMap, map, tap } from 'rxjs/operators';
import { of, Observable, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { addToArray, removeFromArray, dedupeShelfReduce } from './utils';
import { StateService } from './state.service';

// Holds the currently logged in user information
// If available full profile from _users db, if not object in userCtx property of response from a GET _session
// userCtx object = { 'name': <user name>, 'roles': [ <user roles...> ] }

// Also handles writing log information for user sessions

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private user: any = { name: '', roles: [] };
  private usersDb = '_users';
  private logsDb = 'login_activities';
  private _shelf: any = { };
  skipNextShelfRefresh = false;

  get shelf(): any {
    return this._shelf;
  }
  set shelf(shelf: any) {
    this._shelf = shelf;
    if (Object.keys(shelf).length > 0 && !this.skipNextShelfRefresh) {
      this.shelfChange.next(shelf);
    }
    this.skipNextShelfRefresh = false;
  }
  currentSession: any;
  userProperties: string[] = [];
  additionalProperties: string[] = [ 'requestId', '_attachments' ];
  credentialProperties = [ 'derived_key', 'iterations', 'password_scheme', 'salt', 'key', 'iv' ];
  credentials: any;
  emptyShelf = { meetupIds: [], resourceIds: [], courseIds: [], myTeamIds: [] };

  // Create an observable for components that need to react to user changes can subscribe to
  private userChange = new Subject<any>();
  userChange$ = this.userChange.asObservable();
  private shelfChange = new BehaviorSubject<any>(this.emptyShelf);
  shelfChange$ = this.shelfChange.asObservable();
  private userLogout = new Subject<void>();
  userLogout$ = this.userLogout.asObservable();
  private notificationStateChange = new Subject<void>();
  notificationStateChange$ = this.notificationStateChange.asObservable();
  profileComplete = new BehaviorSubject<boolean>(false);
  profileComplete$ = this.profileComplete.asObservable();
  profileBanner = new BehaviorSubject<boolean>(true);
  profileBanner$ = this.profileBanner.asObservable();
  minBirthDate = new Date(1900, 0, 1);


  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  set(user: any): any {
    this.user = user;
    this.userChange.next(user);
  }

  setNotificationStateChange() {
    this.notificationStateChange.next();
  }

  setUserLogout() {
    this.userLogout.next();
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
          const profile = this.getUserProperties(userData);
          this.credentials = this.getUserProperties(userData, this.credentialProperties);
          this.user = profile;
          this.user.roles = [ ...this.user.roles, ...user.roles ].reduce(dedupeShelfReduce, []);
          this.userChange.next(this.user);
        }
        // Get configuration information next if not in testing environment
        if (!environment.test) {
          return this.couchService.findAll('shelf', { 'selector': { '_id': this.user._id } });
        }
        return of([ [] ]);
      }),
      switchMap((shelves: any[]) => {
        const [ shelf ] = shelves;

        if (shelf && shelf._id) {
          // Combine with empty shelf in case all fields are not present
          this.shelf = { ...this.emptyShelf, ...shelf };
          return of(true);
        }

        if (environment.test) {
          this.shelf = { ...this.emptyShelf };
          return of(true);
        }

        return this.couchService.put('shelf/' + this.user._id, { ...this.emptyShelf, _id: this.user._id }).pipe(
          switchMap(() => this.couchService.findAll('shelf', { 'selector': { '_id': this.user._id } })),
          tap(([ createdShelf ]: any[]) => {
            this.shelf = { ...this.emptyShelf, ...(createdShelf || { _id: this.user._id }) };
          }),
          map(() => true)
        );
      }));
  }

  getUserProperties(user, properties: string[] = [ ...this.userProperties, ...this.additionalProperties ]): any {
    return properties.reduce((object, key) => ({ ...object, [key]: user[key] }), {});
  }

  getCurrentSession() {
    return this.currentSession ? of(this.currentSession) :
      this.couchService.post(
        this.logsDb + '/_find',
        findDocuments({ 'user': this.get().name }, [ '_id', '_rev', 'loginTime' ], [ { 'loginTime': 'desc' } ], 1)
      ).pipe(map(data => {
        this.currentSession = data.docs[0];
        return this.currentSession;
      }));
  }

  private setUserProperties(users) {
    this.userProperties = users.reduce((properties: string[], user: any) => {
      const { requestId, _attachments, ...profile } = user;
      return [ ...properties, ...Object.keys(profile).filter((prop: string) => this.credentialProperties.indexOf(prop) === -1) ];
    }, []).reduce(dedupeShelfReduce, []);
  }

  unset(): any {
    this.user = { name: '' };
    this.shelf = {};
    this.credentials = {};
    this.currentSession = undefined;
    this.userChange.next(this.user);
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
    return this.getCurrentSession().pipe(switchMap(() => {
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
    const newUserInfo = {
      ...this.credentials,
      ...userInfo,
      // Fix for Health & Achievements forms which can initialize middle name to undefined
      middleName: userInfo.middleName || '',
      roles: userInfo.roles.filter(role => role.indexOf('_') === -1)
    };
    // ...is the rest syntax for object destructuring
    return this.couchService.put(this.usersDb + '/org.couchdb.user:' + userInfo.name, { ...newUserInfo, type: 'user' }).pipe(
      switchMap(() => userInfo._id === this.user._id ? this.resetUserData(userInfo._id) : of({})),
      switchMap(() => {
        const profile = this.getUserProperties(newUserInfo);
        if (newUserInfo.name !== this.get().name) {
          this.userChange.next(profile);
        }
        if (planetConfiguration.adminName === newUserInfo.name + '@' + planetConfiguration.code) {
          return this.updateConfigurationContact(newUserInfo, planetConfiguration);
        }
        return of({ ok: true });
      })
    );
  }

  resetUserData(userId: string) {
    return this.couchService.get(`${this.usersDb}/${userId}`).pipe(tap(newUser => {
      const profile = this.getUserProperties(newUser);
      if (this.user.roles.indexOf('_admin') !== -1) {
        profile.roles.push('_admin');
      }
      this.credentials = this.getUserProperties(newUser, this.credentialProperties);
      this.set(profile);
    }));
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

  doesUserHaveRole(searchRoles: string[]) {
    return this.user?.roles?.findIndex(userRole => searchRoles.findIndex(searchRole => searchRole === userRole) > -1) > -1;
  }

  isBetaEnabled(): boolean {
    const configuration = this.stateService.configuration;
    return configuration.betaEnabled === 'on' ||
      configuration.betaEnabled === 'user' && this.user.betaEnabled === true;
  }

  addImageForReplication(addNew = false, users: any[] = [ this.user ]) {
    const query = findDocuments({ '_id': { '$in': users.map(user => `${user._id}@${user.planetCode}`) } });
    return this.couchService.findAll('attachments', query).pipe(
      switchMap((attachmentDocs: any[]) => {
        const obs = users.reduce((obsArr, user) => {
          const key = user._attachments && Object.keys(user._attachments)[0];
          const attachmentDoc = attachmentDocs.find(aDoc => aDoc.userId === user._id);
          const aDocDigest = attachmentDoc && attachmentDoc._attachments[key] && attachmentDoc._attachments[key].digest;
          if (key && ((attachmentDoc === undefined && addNew) || user._attachments[key].digest !== aDocDigest)) {
            return [ ...obsArr, this.getProfileImage(user, attachmentDoc) ];
          }
          return obsArr;
        }, []);
        return obs.length > 0 ? forkJoin(obs) : of(obs);
      }),
      switchMap((res: any[]) => res.length > 0 ? this.updateProfileImagesForReplication(res) : of([]))
    );
  }

  private getProfileImage(user, attachmentDoc = {}) {
    return this.couchService.get(`${this.usersDb}/${user._id}?attachments=true`, { headers: { 'Accept': 'application/json' } }).pipe(
      map(u => ({ ...u, attachmentDoc }))
    );
  }

  private updateProfileImagesForReplication(userDocs: any[]) {
    return this.couchService.bulkDocs('attachments', userDocs.map(userDoc => ({
      _id: `${userDoc._id}@${userDoc.planetCode}`,
      userId: userDoc._id,
      planetCode: userDoc.planetCode,
      parentCode: userDoc.parentCode,
      _rev: userDoc.attachmentDoc._rev,
      _attachments: userDoc._attachments
    })));
  }

  isProfileComplete() {
    const isComplete = !!(this.user.firstName && this.user.lastName && this.user.email && this.user.birthDate &&
      this.user.gender && this.user.language && this.user.phoneNumber && this.user.level);
    this.profileComplete.next(isComplete);
  }

}
