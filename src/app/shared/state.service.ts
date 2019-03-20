import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { Subject, forkJoin, of } from 'rxjs';
import { map, flatMap, toArray, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  state: any = { local: {}, parent: {} };
  private stateUpdated = new Subject<any>();
  private inProgress = { local: new Map(), parent: new Map() };

  get configuration(): any {
    return this.state.local.configurations.docs[0] || {};
  }

  constructor(
    private couchService: CouchService
  ) {}

  requestBaseData() {
    const baseDbs = [ 'resources' ];
    baseDbs.forEach(db => {
      if (!this.state.local[db]) {
        this.requestData(db, 'local', [ { 'createdDate': 'desc' }] );
      }
    });
  }

  requestData(db: string, planetField: string, sort?: any) {
    if (this.inProgress[planetField].get(db) !== true) {
      this.inProgress[planetField].set(db, true);
      this.getCouchState(db, planetField, sort).subscribe(() => {});
    }
  }

  getCouchState(db: string, planetField: string, sort?: any) {
    const opts = this.optsFromPlanetField(planetField);
    this.state[planetField] = this.state[planetField] || {};
    this.state[planetField][db] = this.state[planetField][db] || { docs: [], lastSeq: 'now' };
    const currentData = this.state[planetField][db].docs;
    const getData = currentData.length === 0 ?
      this.getAll(db, opts, sort) : this.getChanges(db, opts, planetField);
    return getData.pipe(
      map((changes) => {
        const newData = this.combineChanges(this.state[planetField][db].docs, changes);
        this.state[planetField][db].docs = newData;
        this.stateUpdated.next({ newData, db, planetField });
        this.inProgress[planetField].set(db, false);
        return newData;
      })
    );
  }

  optsFromPlanetField(planetField: string) {
    switch (planetField) {
      case 'parent':
        return { domain: this.configuration.parentDomain };
      case 'local':
        return {};
      default:
        return { domain: planetField };
    }
  }

  getAll(db: string, opts: any, sort: any = 0) {
    return this.couchService.findAllStream(db, findDocuments({
      '_id': { '$gt': null }
    }, 0, sort, 1000), opts);
  }

  getChanges(db: string, opts: any, planetField: string) {
    return this.couchService
    .get(db + '/_changes?include_docs=true&since=' + (this.state[planetField][db].lastSeq || 'now'), opts)
    .pipe(map((res: any) => {
      this.state[planetField][db].lastSeq = res.last_seq;
      return res.results.filter((r: any) => r.doc._id.indexOf('_design') === -1).map((r: any) => r.doc);
    }));
  }

  couchStateListener(db: string) {
    return this.stateUpdated.pipe(map((stateObj: { newData, db, planetField }) => db === stateObj.db ? stateObj : undefined));
  }

  combineChanges(docs: any[], changesDocs: any[]) {
    return docs.reduce((newDocs: any[], doc: any) => {
      const changesDoc = changesDocs.find((cDoc: any) => doc._id === cDoc._id);
      if (changesDoc && changesDoc._deleted === true) {
        return newDocs;
      }
      newDocs.push(changesDoc !== undefined ? changesDoc : doc);
      return newDocs;
    }, []).concat(
      changesDocs.filter((cDoc: any) =>
        cDoc._deleted !== true && docs.findIndex((doc: any) => doc._id === cDoc._id) === -1)
    );
  }

}
