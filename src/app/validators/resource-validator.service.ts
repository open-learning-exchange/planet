import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { map, switchMap } from 'rxjs/operators';

import { findOneDocument } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

@Injectable()
export class ResourceValidatorService {
  readonly dbName = 'resources';

  constructor(private couchService: CouchService) {}

  // $ is used as a convention to indicate that return type will be an Observable
  public resourceCheckerService$(title: string): Observable<boolean> {
    return this.couchService
      .post(`${this.dbName}/_find`, findOneDocument('title', title))
      .pipe(map(data => {
        return data.docs.length > 0;
      }));
  }

  public checkResourceExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.resourceCheckerService$(ac.value)),
      map(exists => {
        if (exists) {
          return { duplicate: true };
        }
        return null;
      }));
  }

}
