import { Injectable } from '@angular/core';
import { of, forkJoin, BehaviorSubject } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { switchMap, catchError } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { UsersService } from '../users/users.service';
import { stringToHex, ageFromBirthDate } from '../shared/utils';
import { findDocuments } from '../shared/mangoQueries';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  private examinations = new BehaviorSubject<any[]>([]);
  examinationsUpdated = this.examinations.asObservable();
  healthData: any = {};
  readonly encryptedFields = [
    'events', 'profile', 'lastExamination', 'userKey',
    'allergies', 'createdBy', 'diagnosis', 'immunizations', 'medications', 'notes', 'referrals', 'tests', 'treatments', 'xrays'
   ];
   private eventDetail = new BehaviorSubject({});
   shareEventDetail = this.eventDetail.asObservable();

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private usersService: UsersService
  ) {}

  userDatabaseName(userId: string) {
    return `userdb-${stringToHex(this.stateService.configuration.code)}-${stringToHex(userId.split(':')[1])}`;
  }

  getUserKey(userDb: string, createIfNone = false) {
    return this.couchService.findAll(userDb).pipe(
      switchMap((docs: any[]) => {
        const first = docs.reduce((minDoc, doc) => doc.createdOn < minDoc.createdOn ? doc : minDoc, { createdOn: Infinity });
        return first.key && first.iv ?
          of({ doc: first }) :
          createIfNone ?
          this.createUserKey(userDb) :
          of({ doc: {} });
      })
    );
  }

  nextEvent(events) {
    this.eventDetail.next(events);
  }

  createUserKey(userDb) {
    return this.couchService.updateDocument(
      userDb,
      { key: this.generateKey(32), iv: this.generateKey(16), createdOn: this.couchService.datePlaceholder }
    );
  }

  userHealthSecurity(userDb) {
    return this.couchService.get(`${userDb}/_security`).pipe(switchMap((securityDoc: any) => {
      const securityHasHealth = securityDoc.members === undefined || securityDoc.members.roles === undefined ||
        securityDoc.members.roles.indexOf('health') === -1;
      const securityPost = securityHasHealth ?
        this.couchService.put(`${userDb}/_security`, {
          ...securityDoc,
          members: { ...securityDoc.members, roles: [ ...(securityDoc.members.roles || []), 'health' ] }
        }) :
        of({});
      return securityPost;
    }));
  }

  getHealthData(userId, { docId = userId, createKeyIfNone = false } = {}) {
    return this.getUserKey(this.userDatabaseName(userId), createKeyIfNone).pipe(
      switchMap(({ doc }: any) => forkJoin([ this.getHealthDoc(docId, doc), of(doc) ]))
    );
  }

  private getHealthDoc(userId, { key, iv }) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key, iv }).pipe(
      catchError(() => of({ _id: userId, profile: {}, events: [] }))
    );
  }

  private postHealthDoc(oldDoc, newDoc, keyDoc) {
    const { encryptData, ...newHealthDoc } = Object.entries({ ...oldDoc, ...newDoc }).reduce((healthObj, [ key, value ]) => {
      const isEncryptField = this.encryptedFields.indexOf(key) > -1;
      return {
        ...healthObj,
        [isEncryptField ? 'encryptData' : key]: isEncryptField ? { ...healthObj.encryptData, [key]: value } : value
      };
    }, { encryptData: {} });
    return this.couchService.put(
      'health/_design/health/_update/encrypt',
      { ...newHealthDoc, encryptData, key: keyDoc.key, iv: keyDoc.iv }
    );
  }

  addEvent(userId: string, creatorId: string, oldEvent: any, newEvent: any) {
    this.usersService.requestUsers();
    return forkJoin([
      this.getHealthData(userId, { createKeyIfNone: true }),
      this.getHealthData(creatorId, { createKeyIfNone: userId !== creatorId }),
      this.couchService.get(`_users/${userId}`),
      this.couchService.currentTime()
    ]).pipe(
      switchMap(([ [ healthDoc, keyDoc ], [ creatorHealthDoc, creatorKeyDoc ], user, time ]: [ any, any, any, number ]) => {
        const userKey = healthDoc.userKey || this.generateKey(32);
        const creatorKey = newEvent.selfExamination ? userKey : (creatorHealthDoc.userKey || this.generateKey(32));
        const age = ageFromBirthDate(time, user.birthDate);
        const eventData = this.newEventDoc(oldEvent, newEvent, time);
        return forkJoin([
          this.postHealthDoc(healthDoc, { userKey, lastExamination: time }, keyDoc),
          this.postHealthDoc({}, { ...eventData, profileId: userKey, creatorId: creatorKey, gender: user.gender, age }, keyDoc),
          creatorHealthDoc.userKey || newEvent.selfExamination ?
            of({}) :
            this.postHealthDoc(creatorHealthDoc, { userKey: creatorKey }, creatorKeyDoc)
        ]);
      })
    );
  }

  newEventDoc(oldEvent: any, newEvent: any, time: number) {
    return {
      ...oldEvent,
      ...newEvent,
      date: oldEvent.date || time,
      updatedDate: time
    };
  }

  postHealthProfileData(data) {
    return this.getHealthData(data._id, { createKeyIfNone: true }).pipe(
      switchMap(([ healthDoc, keyDoc ]: any[]) => this.postHealthDoc(healthDoc, data, keyDoc))
    );
  }

  generateKey(size: number) {
    if (size % 16 !== 0) {
      console.error('Invalid key size');
      return;
    }
    const hexDigits = '0123456789abcdef';
    const keyArray = new Uint8Array(size);
    window.crypto.getRandomValues(keyArray);

    return keyArray.reduce((hexString, number) => `${hexString}${hexDigits[Math.floor(number / 16)]}${hexDigits[number % 16]}`, '');
  }

  getExaminations(planetCode) {
    return this.couchService.findAll('health', findDocuments({ planetCode }));
  }

  deleteExamination(eventId: string, eventRev: string) {
    return this.couchService.delete(`health/${eventId}?rev=${eventRev}`).pipe(
      switchMap(() => this.getExaminations(this.stateService.configuration.code)),
      switchMap((exams: any[]) => {
        this.examinations.next(exams);
        return of(true);
      })
    );
  }
}
