import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { findAllDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

import { switchMap, map } from 'rxjs/operators';

@Injectable()
export class NationValidatorService {
  readonly dbName = 'nations';

  constructor(private couchService: CouchService) {}
    public nationCheckerService$(name: string, nationUrl:string): Observable<boolean> {
      const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, findAllDocuments('name', name, 'nationUrl', nationUrl))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
      return fromPromise(isDuplicate);
    }
    public checkNationExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    const errMessage = {
      duplicateNation: { message: 'Nation already exists' }
    };
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.nationCheckerService$(ac.value).pipe(map(res => {
          if (res) {
            return errMessage;
          }
          return null;
        }));
      })
    );
  }
  public checkNationUrlExists$(
    nurl: AbstractControl
  ): Observable<ValidationErrors | null> {
    const errMessage = {
      duplicateNation: { message: 'Nation Url already exists' }
    };
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.nationCheckerService$(nurl.value).pipe(map(res => {
          if (res) {
            return errMessage;
          }
          return null;
        }));
      })
    );
  }

}
