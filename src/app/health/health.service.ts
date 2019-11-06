import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap, tap } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { stringToHex } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  healthData: any = {};

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService
  ) {}

  getUserKey() {
    const userDb = `userdb-${stringToHex(this.stateService.configuration.code)}-${stringToHex(this.userService.get().name)}`;
    return this.couchService.findAll(userDb).pipe(
      switchMap((docs: any[]) => {
        const max = docs.reduce((maxDoc, doc) => doc.createdOn > maxDoc.createdOn ? doc : maxDoc, { createdOn: -Infinity });
        return max.key && max.iv ?
          of({ doc: max }) :
          this.createUserKey(userDb);
      })
    );
  }

  createUserKey(userDb) {
    return this.couchService.updateDocument(
      userDb,
      { key: this.generateKey(32), iv: this.generateKey(16), createdOn: this.couchService.datePlaceholder }
    );
  }

  getHealthData(userId) {
    return this.getUserKey().pipe(
      switchMap(({ doc }: any) => this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key: doc.key, iv: doc.iv })),
      tap((response) => this.healthData = response),
    );
  }

  addEvent(_id: string, event: any) {
    return this.postHealthData({ _id, events: [ ...(this.healthData.events || []), event ] });
  }

  postHealthData(data) {
    return this.getUserKey().pipe(switchMap(({ doc }: any) =>
      this.couchService.put('health/_design/health/_update/encrypt', { ...this.healthData, ...data, key: doc.key, iv: doc.iv })
    ));
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
