import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { map } from 'rxjs/operators';
import { findDocuments } from '../mangoQueries';
import { UserService } from '../user.service';

const listColumns = {
  'resources': [ 'title' ],
  'courses': [ 'courseTitle' ],
  '_users': [ 'name' ],
  'communityregistrationrequests': [ 'name', 'code', 'localDomain' ]
};

@Injectable()
export class DialogsListService {

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  defaultSelectors() {
    return {
      '_users': {
        '$nor': [
          { '_id': this.userService.get()._id },
          { '_id': 'org.couchdb.user:satellite' }
        ],
        '$or': [
          { 'roles': { '$in': [ 'learner', 'leader' ] } },
          { 'isUserAdmin': true }
        ]
      }
    };
  }

  getListAndColumns(db: string, selector?: any, opts: any = {}) {
    selector = selector || this.defaultSelectors()[db] || {};
    return this.couchService.post(db + '/_find', findDocuments(selector), opts).pipe(map((res) => {
      return { tableData: res.docs, columns: listColumns[db] };
    }));
  }

}
