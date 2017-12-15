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
export class CourseValidatorService {
  readonly dbName = 'courses';

  constructor(private couchService: CouchService) {}

  // $ is used as a convention to indicate that return type will be an Observable
  public courseCheckerService$(title: string): Observable<boolean> {
    return this.couchService
      .post(`${this.dbName}/_find`, findOneDocument('courseTitle', title))
      .pipe(map(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      }));
  }

  public checkCourseExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.courseCheckerService$(ac.value)),
      map(length => {
        if (length > 0) {
          return { duplicate: true };
        }
        return null;
      }));

  }
}
