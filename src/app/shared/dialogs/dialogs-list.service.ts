import { Injectable } from '@angular/core';
import { map, takeWhile, multicast } from 'rxjs/operators';
import { findDocuments } from '../mangoQueries';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { ReplaySubject } from 'rxjs';
import { CouchService } from '../couchdb.service';

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
    private stateService: StateService,
    private userService: UserService,
    private couchService: CouchService
  ) {}

  defaultSelectorFunctions() {
    const users = (user) => {
      const { _id, roles, isUserAdmin, requestId } = user;
      return (
        _id !== this.userService.get()._id && _id !== 'org.couchdb.user:satellite' &&
        (roles.indexOf('learner') > -1 ||  roles.indexOf('leader') > -1 || isUserAdmin === true) &&
        requestId === undefined
      );
    };
    return {
      '_users': users,
      'child_users': users
    };
  }

  filterResults(data, selector) {
    return data.filter(item => {
      if (selector instanceof Function) {
        return selector(item);
      }
      return Object.entries(selector).reduce((match, [ field, value ]) => item[field] === value, false);
    });
  }

  getListAndColumns(db: string, selector?: any, planetField: string = 'local') {
    selector = selector || this.defaultSelectorFunctions()[db];
    const fields = db === '_users' || db === 'child_users' ? this.couchService.post('_users/_find', { 'selector': { } }) : [];
    // console.log(this.couchService.post('_users/_find', { 'selector': { } }));
    return this.stateService.getCouchState(db, planetField).pipe(
      map((newData: any) => {
        const tableData = selector ? this.filterResults(newData, selector) : newData;
        return { tableData, columns: listColumns[db] };
      })
    );
  }

}
