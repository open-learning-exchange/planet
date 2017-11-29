import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable()
export class CouchService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;

  private setOpts(opts?: any) {
    return Object.assign({}, this.defaultOpts, opts) || this.defaultOpts;
  }

  constructor(private http: HttpClient) {}

  put(db: string, data: any, opts?: any): Promise<any> {

    return this.http
      .put(this.baseUrl + db, JSON.stringify(data) || '', this.setOpts(opts))
      .toPromise();
  }

  post(db: string, data: any, opts?: any): Promise<any> {

    return this.http
      .post(this.baseUrl + db, JSON.stringify(data) || '', this.setOpts(opts))
      .toPromise();
  }

  get(db: string, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    opts = this.setOpts(opts);

    return this.http
      .get(url, opts)
      .toPromise();
  }

  delete(db: string, opts?: any): Promise<any> {
    const url = this.baseUrl + db;
    opts = this.setOpts(opts);

    return this.http
      .delete(url, opts)
      .toPromise();
  }

}
