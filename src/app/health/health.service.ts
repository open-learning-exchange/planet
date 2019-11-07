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

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  getUserKey(userId: string) {
    const userDb = `userdb-${stringToHex(this.stateService.configuration.code)}-${stringToHex(userId.split(':')[1])}`;
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
    return this.getUserKey(userId).pipe(
      switchMap(({ doc }: any) => this.getHealthDoc(userId, doc)),
    );
  }

  private getHealthDoc(userId, { key, iv }) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key, iv }).pipe(
      catchError(() => of({ profile: {}, events: [] }))
    );
  }

  addEvent(_id: string, event: any) {
    return this.postHealthData({ _id, events: [ ...(this.healthData.events || []), event ] });
  }

  postHealthData(data) {
    return this.getUserKey(data._id).pipe(
      switchMap(({ doc }: any) => forkJoin([ of(doc), this.getHealthDoc(data._id, doc) ])),
      switchMap(([ keyDoc, healthDoc ]: any[]) =>
        this.couchService.put('health/_design/health/_update/encrypt', { ...healthDoc, ...data, key: keyDoc.key, iv: keyDoc.iv })
      )
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
