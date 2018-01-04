import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { findOneDocument } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { takeUntil } from 'rxjs/operators';
import { switchMap, map } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
@Injectable()
export class ValidatorService {

constructor(private couchService: CouchService) {}

  public checkUnique$(db: string, field: string, value: any): Observable<boolean> {
    return this.couchService
      .post(`${db}/_find`, findOneDocument(field, value))
      .pipe(map(data => {
        return data.docs.length > 0;
      }));
  }

  public isUnique$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.checkUnique$(dbName, fieldName, ac.value)),
      map(exists => {
        if (exists) {
          return { duplicate: true };
        }
        return null;
      })
    ).debug('Checking uniqueness of ' + fieldName + ' in ' + dbName);
  }

  public MatchPassword$(
    ac: AbstractControl, ac1: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      map(exists => {
        // for unsubscribing from Observables
        const ngUnsubscribe: Subject<void> = new Subject<void>();
        ac1.valueChanges.pipe(takeUntil(ngUnsubscribe)).subscribe(() => {
          ac.updateValueAndValidity();
        });
        if (ac.value !== ac1.value) {
          return { passwordNotMatch: true };
        } else {
          return null;
        }
      })
    );
  }

}
