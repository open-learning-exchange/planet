import { Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';
import { environment } from '../../environments/environment';

@Injectable()
export class CouchService {
  private headers = new Headers({ 'Content-Type': 'application/json' });
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;

  private setOpts(opts?: any) {
    return Object.assign({}, this.defaultOpts, opts) || this.defaultOpts;
  }

  constructor(private http: Http) {}

  put(db: string, data: any, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    const putData = data ? JSON.stringify(data) : '';
    opts = this.setOpts(opts);

    return this.http
      .put(url, putData, opts)
      .toPromise()
      .then(this.handleRes)
      .catch(this.handleError);
  }

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
