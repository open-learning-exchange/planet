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

  defaultSelectors = {
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

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  getListAndColumns(db: string, selector?: any, opts: any = {}) {
    this.defaultSelectors['_users']['$nor'][0]['_id'] = this.userService.get()._id;
    selector = selector || this.defaultSelectors[db] || {};
    return this.couchService.post(db + '/_find', findDocuments(selector), opts).pipe(map((res) => {
      return { tableData: res.docs, columns: listColumns[db] };
    }));
  }

}
