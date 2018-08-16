import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { map } from 'rxjs/operators';
import { findDocuments } from '../mangoQueries';
import { UserService } from '../user.service';

const listColumns = {
  'resources': [ 'title' ],
  'courses': [ 'courseTitle' ],
  '_users': [ 'name' ],
  'child_users': [ 'name' ],
  'communityregistrationrequests': [ 'name', 'code', 'localDomain' ]
};

@Injectable()
export class DialogsListService {

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  defaultSelectors() {
    const users = {
      '$nor': [
        { '_id': this.userService.get()._id },
        { '_id': 'org.couchdb.user:satellite' }
      ],
      '$or': [
        { 'roles': { '$in': [ 'learner', 'leader' ] } },
        { 'isUserAdmin': true }
      ],
      'requestId': { '$exists': false }
    };
    return {
      '_users': users,
      'child_users': users
    };
  }

  getListAndColumns(db: string, selector?: any, opts: any = {}) {
    selector = selector || this.defaultSelectors()[db] || {};
    const fields = db === '_users' || db === 'child_users' ? this.userService.userProperties : [];
    return this.couchService.post(db + '/_find', findDocuments(selector, fields), opts).pipe(map((res) => {
      return { tableData: res.docs, columns: listColumns[db] };
    }));
  }

}
