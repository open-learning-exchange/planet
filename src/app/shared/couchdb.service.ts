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

  private couchDBReq(type: string, db: string, opts: any, data?: any, parentLink?: any) {
    const url = parentLink ? 'http://' + parentLink + '/' + db : this.baseUrl + db;
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

  put(db: string, data: any, opts?: any, parentLink?: any): Observable<any> {
    return this.couchDBReq('put', db, this.setOpts(opts), JSON.stringify(data) || '', parentLink);
  }

  post(db: string, data: any, opts?: any, parentLink?: any): Observable<any> {
    return this.couchDBReq('post', db, this.setOpts(opts), JSON.stringify(data) || '', parentLink);
  }

  get(db: string, opts?: any, parentLink?: any): Observable<any> {
    return this.couchDBReq('get', db, this.setOpts(opts), '', parentLink);
  }

  delete(db: string, opts?: any, parentLink?: any): Observable<any> {
    return this.couchDBReq('delete', db, this.setOpts(opts), '', parentLink);
  }

  // Reads a file as a Base64 string to append to object sent to CouchDB
  prepAttachment(file) {
    const reader = new FileReader();
    const obs = Observable.create((observer) => {
      reader.onload = () => {
        // FileReader result has file type at start of string, need to remove for CouchDB
        const fileData = reader.result.split(',')[1],
        attachments = {};
        attachments[file.name] = {
          content_type: file.type,
          data: fileData
        };
        const attachmentObject = {
          _attachments: attachments
        };
        observer.next(attachmentObject);
        observer.complete();
      };
    });
    reader.readAsDataURL(file);
    return obs;
  }

}
