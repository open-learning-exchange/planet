import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, tap, distinctUntilChanged } from 'rxjs/operators';
import { CouchService } from '../couchdb.service';
import { deepEqual } from '../utils';
import { StateService } from '../state.service';
import { UserService } from '../user.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private searchChange: Subject<any>;
  readonly dbName = 'search_activities';
  private inProgress = false;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService
  ) {
    this.initObservable();
  }

  initObservable() {
    this.searchChange = new Subject<any>();
    this.searchChange.pipe(
      tap(() => this.inProgress = true),
      debounceTime(5000),
      distinctUntilChanged((a, b) => deepEqual(a, b)),
      switchMap(value => this.couchService.updateDocument(
        this.dbName,
        {
          ...value,
          time: this.couchService.datePlaceholder,
          user: this.userService.get().name,
          createdOn: this.stateService.configuration.code,
          parentCode: this.stateService.configuration.parentCode
        }
      ))
    ).subscribe(() => this.inProgress = false);
  }

  recordSearch(value, complete = false) {
    if (!complete || this.inProgress) {
      this.searchChange.next(value);
    }
    if (complete) {
      this.searchChange.complete();
      this.initObservable();
    }
  }

}
