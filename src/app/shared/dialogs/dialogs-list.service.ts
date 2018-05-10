import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { map } from 'rxjs/operators';

const listColumns = {
  'resources': [ 'title' ]
};

@Injectable()
export class DialogsListService {

  constructor(
    private couchService: CouchService
  ) {}

  getListAndColumns(db: string) {
    return this.couchService.allDocs(db).pipe(map((res) => {
      return { tableData: res, columns: listColumns[db] };
    }));
  }

}
