import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';
import { debug } from '../debug-operator';

@Injectable()
export class CouchService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;
  private reqNum = 0;

  private setOpts(opts: any = {}) {
    const { domain, ...httpOpts } = opts;
    return [ domain, Object.assign({}, this.defaultOpts, httpOpts) || this.defaultOpts ];
  }

  private couchDBReq(type: string, db: string, [ domain, opts ]: any[], data?: any) {
    const url = domain ? environment.centerProtocol + '://' + domain + '/' + db : this.baseUrl + db;
    let httpReq: Observable<any>;
    if (type === 'post' || type === 'put') {
      httpReq = this.http[type](url, data, opts);
    } else {
      httpReq = this.http[type](url, opts);
    }
    this.reqNum++;
    return httpReq.pipe(debug('Http ' + type + ' ' + this.reqNum + ' request'));
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

  allDocs(db: string, opts?: any) {
    return this.couchDBReq('get', db + '/_all_docs?include_docs=true', this.setOpts(opts)).pipe(map((data: any) => {
      // _all_docs returns object with rows array of objects with 'doc' property that has an object with the data.
      return data.rows.map((res: any) => {
          // Map over data.rows to remove the 'doc' property layer
          return res.doc;
        }).filter((doc: any) => {
          // Filter out any design documents
          return doc._id.indexOf('_design') === -1;
        });
    }));
  }

  stream(method: string, db: string) {
    const url = this.baseUrl + db;
    const req = new HttpRequest(method, url, {
      reportProgress: true
    });
    return this.http.request(req);
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
