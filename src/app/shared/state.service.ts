import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { Subject, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  state: any = { local: {}, parent: {} };
  private stateUpdated = new Subject<any>();

  get configuration(): any {
    return this.state.local.configurations.docs[0] || {};
  }

  constructor(
    private couchService: CouchService
  ) {}

  requestData(db: string, planetField: string) {
    this.getCouchState(db, planetField).subscribe(() => {});
  }

  getCouchState(db: string, planetField: string) {
    const opts = this.optsFromPlanetField(planetField);
    this.state[planetField] = this.state[planetField] || {};
    this.state[planetField][db] = this.state[planetField][db] || { docs: [], lastSeq: 'now' };
    const currentData = this.state[planetField][db].docs;
    const getCurrentData = currentData.length === 0 ?
      this.getAll(db, opts) : of(currentData);
    return forkJoin([ getCurrentData, this.getChanges(db, opts, planetField) ]).pipe(
      map(([ data, changes ]) => {
        const newData = this.couchService.combineChanges(data, changes);
        this.state[planetField][db].docs = newData;
        this.stateUpdated.next({ newData, db, planetField });
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

  getAll(db: string, opts: any) {
    return this.couchService.findAll(db, findDocuments({
      '_id': { '$gt': null }
    }, [], [], 1000), opts);
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

}
