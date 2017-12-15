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

  public nationCheckerService$(header: string, name: string): Observable<boolean> {
    return this.couchService
      .post(`${this.dbName}/_find`, findAllDocuments(header, name))
      .pipe(map(data => {
        return data.docs.length > 0;
      }));
  }

  public checkNationExists$(
    header: string,
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.nationCheckerService$(header, ac.value)),
      map(exists => {
        if (exists) {
          return { duplicate: true };
        }
        return null;
      }));
  }

}
