import { Injectable, EventEmitter } from '@angular/core';
import { Headers, Http } from '@angular/http';
import { environment } from '../../environments/environment';

import * as PouchDB from 'pouchdb-browser';
// const PouchDB = require('pouchdb-browser');
@Injectable()
export class CouchService {
  private headers = new Headers({ 'Content-Type': 'application/json' });
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;

  private pouch: any;
  private listener: EventEmitter<any> = new EventEmitter();

  private setOpts(opts?: any) {
    return Object.assign({}, this.defaultOpts, opts) || this.defaultOpts;
  }

  constructor(private http: Http) {
    this.pouch = new PouchDB('bell-apps');
  }

  put(db: string, data: any, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    const putData = data ? JSON.stringify(data) : '';
    opts = this.setOpts(opts);
    return this.http
      .put(url, putData, opts)
      .toPromise()
      .then(this.handleRes)
      .catch(this.handleError);
    // should probably use uuids
    // return this.pouch
    //   .put({ _id: `db:${new Date().getTime()}`, name: 'Perhaps' })
    //   .then(res => {
    //     console.log(res.data);
    //   });
  }

  // public sync() {
  //   const remoteDB = new PouchDB(this.baseUrl);
  //   this.pouch
  //     .sync(remoteDB, { live: true, retry: true })
  //     .on('change', change => {
  //       this.listener.emit(change);
  //     })
  //     .on('error', error => {
  //       console.error(JSON.stringify(error));
  //     });
  // }

  // public getChangeListener() {
  //   return this.listener;
  // }

  post(db: string, data: any, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    const postData = data ? JSON.stringify(data) : '';
    opts = this.setOpts(opts);

    return this.http
      .post(url, postData, opts)
      .toPromise()
      .then(this.handleRes)
      .catch(this.handleError);
  }

  get(db: string, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    opts = this.setOpts(opts);

    return this.http
      .get(url, opts)
      .toPromise()
      .then(this.handleRes)
      .catch(this.handleError);
  }

  delete(db: string, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    opts = this.setOpts(opts);

    return this.http
      .delete(url, opts)
      .toPromise()
      .then(this.handleRes)
      .catch(this.handleError);
  }

  private handleRes = (res: any) => res.json();

  private handleError(error: any): Promise<any> {
    return Promise.reject(error.json());
  }
}
