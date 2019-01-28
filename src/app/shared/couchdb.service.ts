import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, empty, throwError } from 'rxjs';
import { catchError, map, expand, takeWhile, toArray, flatMap, switchMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { PlanetMessageService } from './planet-message.service';
import { findDocuments, inSelector } from './mangoQueries';

class DatePlaceholder {}

@Injectable()
export class CouchService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;
  private reqNum = 0;
  datePlaceholder = new DatePlaceholder();

  private setOpts(opts: any = {}) {
    const { domain, protocol, ...httpOpts } = opts;
    return [ domain, protocol, Object.assign({}, this.defaultOpts, httpOpts) || this.defaultOpts ];
  }

  private couchDBReq(type: string, db: string, [ domain, protocol, opts ]: any[], data?: any) {
    const url = (domain ? (protocol || environment.parentProtocol) + '://' + domain : this.baseUrl) + '/' + db;
    let httpReq: Observable<any>;
    if (type === 'post' || type === 'put') {
      httpReq = this.http[type](url, data, opts);
    } else {
      httpReq = this.http[type](url, opts);
    }
    this.reqNum++;
    return httpReq
      .pipe(debug('Http ' + type + ' ' + this.reqNum + ' request'))
      .pipe(catchError(err => {
        if (err.status === 403) {
          this.planetMessageService.showAlert('You are not authorized. Please contact administrator.');
        }
        return throwError(err);
      }));
  }

  constructor(
    private http: HttpClient,
    private planetMessageService: PlanetMessageService
  ) {}

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

  putAttachment(db: string, file: FormData, opts?: any) {
    return this.couchDBReq('put', db, this.setOpts(opts), file);
  }

  updateDocument(db: string, doc: any, opts?: any) {
    let docWithDate: any;
    return this.currentTime().pipe(
      switchMap((date) => {
        docWithDate = this.fillInDateFields(doc, date);
        return this.post(db, docWithDate, opts);
      }),
      map((res: any) => {
        return ({ ...res, doc: { ...docWithDate, _rev: res.rev, _id: res.id } });
      })
    );
  }

  localComparison(db: string, parentDocs: any[]) {
    return this.findAll(db, findDocuments({ '_id': { '$gt': null } }, 0, 0, 1000)).pipe(map((localDocs) => {
      return parentDocs.map((parentDoc) => {
        const localDoc: any = localDocs.find((doc: any) => doc._id === parentDoc._id);
        return {
          ...parentDoc,
          localStatus: localDoc !== undefined ? this.compareRev(parentDoc._rev, localDoc._rev) : 0
        };
      });
    }));
  }

  findAll(db: string, query: any = { 'selector': { '_id': { '$gt': null } }, 'limit': 1000 }, opts?: any) {
    return this.findAllRequest(db, query, opts).pipe(flatMap(({ docs }) => docs), toArray());
  }

  findAllStream(db: string, query: any = { 'selector': { '_id': { '$gt': null } }, 'limit': 1000 }, opts?: any) {
    return this.findAllRequest(db, query, opts).pipe(map(({ docs }) => docs));
  }

  private findAllRequest(db: string, query: any, opts: any) {
    return this.post(db + '/_find', query, opts).pipe(
      catchError(() => {
        return of({ docs: [], rows: [] });
      }),
      expand((res) => {
        return res.docs.length > 0 ? this.post(db + '/_find', { ...query, bookmark: res.bookmark }, opts) : empty();
      })
    );
  }

  bulkGet(db: string, ids: string[], opts?: any) {
    const docs = ids.map(id => ({ id }));
    return this.post(db + '/_bulk_get', { docs }, opts).pipe(
      map((response: any) => response.results
        .map((result: any) => result.docs[0].ok)
        .filter((doc: any) => doc._deleted !== true)
      )
    );
  }

  stream(method: string, db: string) {
    const url = this.baseUrl + '/' + db;
    const req = new HttpRequest(method, url, {
      reportProgress: true
    });
    return this.http.request(req);
  }

  getTags(db: string, opts?: any) {
    return this.couchDBReq('get', db + '/_design/' + db + '/_view/count_tags?group=true', this.setOpts(opts)).pipe(map((res: any) => {
      return res.rows.sort((a, b) => b.value - a.value);
    }));
  }

  getUrl(url: string, reqOpts?: any) {
    const [ domainWithPort = '', protocol, opts ] = this.setOpts(reqOpts);
    const domain = domainWithPort ? domainWithPort.split(':')[0].split('/db')[0] : '';
    const urlPrefix = domain ? (protocol || environment.parentProtocol) + '://' + domain : window.location.origin;
    return this.http.get(urlPrefix + '/' + url, opts);
  }

  private compareRev = (parent, local) => {
    if (parent === local) {
      return 'match';
    }
    local = parseInt(local.split('-')[0], 10);
    parent = parseInt(parent.split('-')[0], 10);
    return (local < parent) ? 'newerAvailable' : (local > parent) ? 'parentOlder' : 'mismatch';
  }

  currentTime() {
    return this.getUrl('time').pipe(catchError(() => {
      return of(Date.now());
    }));
  }

  fillInDateFields(data, date) {
    switch (data && data.constructor) {
      case DatePlaceholder:
        return date;
      case Array:
        return data.map((item) => this.fillInDateFields(item, date));
      case Object:
        return Object.entries(data).reduce((dataWithDate, [ key, value ]) => {
          dataWithDate[key] = this.fillInDateFields(value, date);
          return dataWithDate;
        }, {});
      default:
        return data;
    }
  }

}
