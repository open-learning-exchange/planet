import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { switchMap, map } from 'rxjs/operators';

import { findOneDocument } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

@Injectable()
export class ResourceValidatorService {
  readonly dbName = 'resources';

  constructor(private couchService: CouchService) {}

  // $ is used as a convention to indicate that return type will be an Observable
  public resourceCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, findOneDocument('title', title))
      .then(data => {
        return data.docs.length > 0;
      });
    return fromPromise(isDuplicate);
  }

  public checkResourceExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.resourceCheckerService$(ac.value).pipe(map(res => {
          if (res) {
            return { duplicate: true };
          }
          return null;
        }));
      })
    );
  }

}
