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

  key = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ];

  constructor(
    private couchService: CouchService
  ) {}

  getHealthData(userId) {
    return this.couchService.post(`health/_design/health/_show/decrypt/${userId}`, { key: this.key });
  }

  postHealthData(data) {
    return this.couchService.put('health/_design/health/_update/encrypt', { ...data, key: this.key });
  }

}
