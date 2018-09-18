import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, expand, takeWhile, toArray, flatMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { PlanetMessageService } from './planet-message.service';
import { findDocuments, inSelector } from './mangoQueries';

@Injectable()
export class CouchService {
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  private baseUrl = environment.couchAddress;
  private reqNum = 0;

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
        // Empty response for the _find or _all_docs endpoints
        return of({ docs: [], rows: [] });
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

  findAll(db: string, query: any = { 'selector': { '_id': { '$gt': null } } }, opts?: any) {
    console.log(query);
    return this.post(db + '/_find', query, opts).pipe(expand((res) => {
      return this.post(db + '/_find', { ...query, bookmark: res.bookmark }, opts);
    }), takeWhile((res) => {
      return res.docs.length > 0;
    }), flatMap(({ docs }) => docs), toArray());
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
    const url = this.baseUrl + db;
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

}
