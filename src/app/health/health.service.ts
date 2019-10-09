import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  healthDetail: any;
  userDetail: any = { name: '' };
  events: any[] = [];

  addEvent(event: any) {
    this.events = [ ...this.events, event ];
  }

  resetEvents() {
    this.events = [];
  }

  key: string;
  iv: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.userService.userChange$.subscribe(() => {
      this.key = this.userService.credentials.key;
      this.iv = this.userService.credentials.iv;
    });
  }

  getHealthData(userId) {
    if (this.key === undefined || this.iv === undefined) {
      return of({ doc: {} });
    }
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key: this.key, iv: this.iv });
  }

  postHealthData(data) {
    return (this.key === undefined || this.iv === undefined ?
      this.userService.updateUser(
        { ...this.userService.get(), ...this.userService.credentials, key: this.createNewKey(32), iv: this.createNewKey(16) }
      ) :
      of({})
    ).pipe(switchMap(() =>
      this.couchService.put('health/_design/health/_update/encrypt', { ...data, key: this.key, iv: this.iv })
    ));
  }

  createNewKey(size: number) {
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
