import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

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

  key = '0102030405060708090001020304050607080900010203040506070809000102';
  iv = '00010203040506070809000102030405';

  constructor(
    private couchService: CouchService
  ) {}

  getHealthData(userId) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key: this.key, iv: this.iv });
  }

  postHealthData(data) {
    return this.couchService.put('health/_design/health/_update/encrypt', { ...data, key: this.key, iv: this.iv });
  }

}
