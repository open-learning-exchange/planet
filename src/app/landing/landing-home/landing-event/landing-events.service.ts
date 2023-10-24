import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, pluck } from 'ramda';
import isToday from 'date-fns/isToday';
import { isAfter, isBefore } from 'date-fns';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LandingEventsService {
  private baseUrl = environment.uplanetAddress;

  constructor(
    private http: HttpClient
  ) { }

  getEvents(): Observable<any> {
    const url = this.baseUrl + '/pb/meetups/_all_docs?include_docs=true';
    const opts = { withCredentials: true };

    let httpReq: Observable<any>;
    httpReq = this.http.get(url, opts);
    return httpReq;
  }

  formatEvents(data) {
    return pluck('doc', data?.rows ?? []);
  }

  useEvents() {
    this.getEvents().subscribe((data) => {
      return data;
    });
  }

  useEventsV2() {
    this.getEvents().subscribe((data) => {
      return this.formatEvents(data);
    });
  }

  isBetween({ startDate, endDate }) {
    return isToday(startDate)
    || (isAfter(new Date(), startDate)
     && isBefore(new Date(), endDate))
      || isToday(endDate);
  }

  filterToday(events) {
    return filter(this.isBetween, events ?? []);
  }

  useEventsToday() {
    const data = this.useEventsV2();
    return this.filterToday(data);
  }
}
