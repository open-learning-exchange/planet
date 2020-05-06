import { Injectable } from '@angular/core';
import { of, forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { switchMap, catchError } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { stringToHex } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  healthData: any = {};
  readonly encryptedFields = [ 'events', 'profile' ];

  constructor(
    private couchService: CouchService,
    private stateService: StateService
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

  getHealthData(userId, createKeyIfNone = false) {
    return this.getUserKey(this.userDatabaseName(userId), createKeyIfNone).pipe(
      switchMap(({ doc }: any) => forkJoin([ this.getHealthDoc(userId, doc), of(doc) ]))
    );
  }

  private getHealthDoc(userId, { key, iv }) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key, iv }).pipe(
      catchError(() => of({ _id: userId, profile: {}, events: [] }))
    );
  }

  addEvent(_id: string, event: any) {
    return this.postHealthProfileData({ _id, events: [ ...(this.healthData.events || []), event ] });
  }

  postHealthProfileData(data) {
    return this.getHealthData(data._id, true).pipe(
      switchMap(([ healthDoc, keyDoc ]: any[]) => {
        const { encryptData, ...newHealthDoc } = Object.entries({ ...healthDoc, ...data }).reduce((healthObj, [ key, value ]) => {
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
      })
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

}
