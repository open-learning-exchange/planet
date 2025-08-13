import { Injectable } from '@angular/core';
import { of, forkJoin, BehaviorSubject } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { switchMap, catchError } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { UsersService } from '../users/users.service';
import { stringToHex, ageFromBirthDate } from '../shared/utils';
import { findDocuments } from '../shared/mangoQueries';

interface EncryptionDoc { key?: string; iv?: string; createdOn?: number }
interface SecurityDoc { members?: { roles?: string[] } }
interface HealthDoc { userKey?: string; lastExamination?: number; [key: string]: unknown }
interface UserDoc { birthDate: number; gender: string; [key: string]: unknown }
interface EventData { selfExamination?: boolean; [key: string]: unknown }

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  healthData: Record<string, unknown> = {};
  readonly encryptedFields = [
    'events', 'profile', 'lastExamination', 'userKey',
    'allergies', 'createdBy', 'diagnosis', 'immunizations', 'medications', 'notes', 'referrals', 'tests', 'treatments', 'xrays'
   ];
   private eventDetail = new BehaviorSubject<Record<string, unknown>>({});
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
      switchMap((docs: EncryptionDoc[]) => {
        const first: EncryptionDoc = docs.reduce(
          (minDoc, doc) => doc.createdOn! < (minDoc.createdOn || Infinity) ? doc : minDoc,
          { createdOn: Infinity }
        );
        return first.key && first.iv ?
          of({ doc: first }) :
          createIfNone ?
          this.createUserKey(userDb) :
          of({ doc: {} as EncryptionDoc });
      })
    );
  }

  nextEvent(events: Record<string, unknown>) {
    this.eventDetail.next(events);
  }

  createUserKey(userDb: string) {
    return this.couchService.updateDocument(
      userDb,
      { key: this.generateKey(32), iv: this.generateKey(16), createdOn: this.couchService.datePlaceholder }
    );
  }

  userHealthSecurity(userDb: string) {
    return this.couchService.get(`${userDb}/_security`).pipe(switchMap((securityDoc: SecurityDoc) => {
      const securityHasHealth = securityDoc.members === undefined || securityDoc.members.roles === undefined ||
        securityDoc.members.roles.indexOf('health') === -1;
      const securityPost = securityHasHealth ?
        this.couchService.put(`${userDb}/_security`, {
          ...securityDoc,
          members: { ...securityDoc.members, roles: [ ...(securityDoc.members?.roles || []), 'health' ] }
        }) :
        of({});
      return securityPost;
    }));
  }

  getHealthData(userId: string, { docId = userId, createKeyIfNone = false }: { docId?: string; createKeyIfNone?: boolean } = {}) {
    return this.getUserKey(this.userDatabaseName(userId), createKeyIfNone).pipe(
      switchMap(({ doc }: { doc: EncryptionDoc }) => forkJoin([ this.getHealthDoc(docId, doc), of(doc) ]))
    );
  }

  private getHealthDoc(userId: string, { key, iv }: EncryptionDoc) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key, iv }).pipe(
      catchError(() => of<HealthDoc>({ _id: userId, profile: {}, events: [] }))
    );
  }

  private postHealthDoc(oldDoc: Record<string, unknown>, newDoc: Record<string, unknown>, keyDoc: EncryptionDoc) {
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

  addEvent(userId: string, creatorId: string, oldEvent: Record<string, unknown>, newEvent: EventData) {
    this.usersService.requestUsers();
    return forkJoin([
      this.getHealthData(userId, { createKeyIfNone: true }),
      this.getHealthData(creatorId, { createKeyIfNone: userId !== creatorId }),
      this.couchService.get(`_users/${userId}`),
      this.couchService.currentTime()
    ]).pipe(
      switchMap(([ [ healthDoc, keyDoc ], [ creatorHealthDoc, creatorKeyDoc ], user, time ]: [ [HealthDoc, EncryptionDoc], [HealthDoc, EncryptionDoc], UserDoc, number ]) => {
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

  newEventDoc(oldEvent: Record<string, unknown>, newEvent: EventData, time: number) {
    return {
      ...oldEvent,
      ...newEvent,
      date: oldEvent.date || time,
      updatedDate: time
    };
  }

  postHealthProfileData(data: { _id: string; _rev?: string; profile: Record<string, unknown> }) {
    return this.getHealthData(data._id, { createKeyIfNone: true }).pipe(
      switchMap(([ healthDoc, keyDoc ]: [HealthDoc, EncryptionDoc]) => this.postHealthDoc(healthDoc, data, keyDoc))
    );
  }

  generateKey(size: number): string | undefined {
    if (size % 16 !== 0) {
      console.error('Invalid key size');
      return;
    }
    const hexDigits = '0123456789abcdef';
    const keyArray = new Uint8Array(size);
    window.crypto.getRandomValues(keyArray);

    return keyArray.reduce((hexString, number) => `${hexString}${hexDigits[Math.floor(number / 16)]}${hexDigits[number % 16]}`, '');
  }

  getExaminations(planetCode: string) {
    return this.couchService.findAll('health', findDocuments({ planetCode }));
  }

}
