import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { findOneDocument, findAllDocuments } from './mangoQueries';
import { CouchService } from './couchdb.service';

import { switchMap, map } from 'rxjs/operators';

@Injectable()
export class ValidatorService {

constructor(private couchService: CouchService) {}

  public nationCheckerService$(header: string, name: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${'nations'}/_find`, findAllDocuments(header, name))
      .then(data => {
        return (data.docs.length > 0);
      });
    return fromPromise(isDuplicate);
  }

  public checkNationExists$(
    header: string,
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.nationCheckerService$(header, ac.value).pipe(map(res => {
          if (res) {
            return { duplicate: true };
          }
          return null;
        }));
      })
    );
  }

  // $ is used as a convention to indicate that return type will be an Observable
  public resourceCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${'resources'}/_find`, findOneDocument('title', title))
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

  public courseCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${'courses'}/_find`, findOneDocument('courseTitle', title))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
    return fromPromise(isDuplicate);
  }

  public checkCourseExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.courseCheckerService$(ac.value).pipe(map(res => {
          if (res) {
            return { duplicate: true };
          }
          return null;
          }));
      })
    );
  }


}
