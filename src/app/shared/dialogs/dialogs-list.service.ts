import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { map } from 'rxjs/operators';
import { findDocuments } from '../mangoQueries';

const listColumns = {
  'resources': [ 'title' ],
  '_users': [ 'name' ],
  'communityregistrationrequests': [ 'name', 'code', 'localDomain' ]
};

@Injectable()
export class DialogsListService {

  constructor(
    private couchService: CouchService
  ) {}

  getListAndColumns(db: string, selector: any = {}, opts: any = {}) {
    return this.couchService.post(db + '/_find', findDocuments(selector), opts).pipe(map((res) => {
      return { tableData: res.docs, columns: listColumns[db] };
    }));
  }

}
