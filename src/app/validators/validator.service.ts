import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { findOneDocument } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

import { switchMap, map } from 'rxjs/operators';

@Injectable()
export class ValidatorService {

constructor(private couchService: CouchService) {}

  public checkUnique$(db: string, field: string, value: any): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${db}/_find`, findOneDocument(field, value))
      .then(data => {
        return (data.docs.length > 0);
      });
    return fromPromise(isDuplicate);
  }

  public isUnique$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.checkUnique$(dbName, fieldName, ac.value).pipe(map(res => {
          if (res) {
            return { duplicate: true };
          }
          return null;
        }));
      })
    );
  }

}
