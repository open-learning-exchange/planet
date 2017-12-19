import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class CouchService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;
  private reqNum = 0;

  private setOpts(opts?: any) {
    return Object.assign({}, this.defaultOpts, opts) || this.defaultOpts;
  }

  private couchDBReq(type: string, db: string, opts: any, data?: any) {
    const url = this.baseUrl + db;
    let httpReq: Observable<any>;
    if (type === 'post' || type === 'put') {
      httpReq = this.http[type](url, data, opts);
    } else {
      httpReq = this.http[type](url, opts);
    }
    this.reqNum++;
    return httpReq.debug('Http ' + type + ' ' + this.reqNum + ' request');
  }

  constructor(private http: HttpClient) {}

  put(db: string, data: any, opts?: any): Observable<any> {
    return this.couchDBReq('put', db, this.setOpts(opts), JSON.stringify(data) || '');
  }

  post(db: string, data: any, opts?: any): Observable<any> {
    return this.couchDBReq('post', db, this.setOpts(opts), JSON.stringify(data) || '');
  }

  get(db: string, opts?: any): Observable<any> {
    return this.couchDBReq('get', db, this.setOpts(opts));
  }

  delete(db: string, opts?: any): Observable<any> {
    return this.couchDBReq('delete', db, this.setOpts(opts));
  }

}
