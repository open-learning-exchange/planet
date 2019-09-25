import { Injectable } from '@angular/core';

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

}
