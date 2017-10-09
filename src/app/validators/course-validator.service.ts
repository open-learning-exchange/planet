import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import searchDocuments from '../courses/constants';
import { CouchService } from '../shared/couchdb.service';

@Injectable()
export class CourseValidatorService {
  readonly dbName = 'courses';

  constructor(private couchService: CouchService) {}

  // $ is used as a convention to indicate that return type will be an Observable
  public courseCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, searchDocuments('courseTitle', title))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
    return Observable.fromPromise(isDuplicate);
  }

  public checkCourseExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    const errMessage = {
      duplicateCourse: { message: 'Course already exists' }
    };
    // calls service every .5s for input change
    return Observable.timer(500).switchMap(() => {
      return this.courseCheckerService$(ac.value).map(res => {
        if (res) {
          return errMessage;
        }
        return null;
      });
    });

    // another way of checking if course title is unique
    // this.courseForm.controls['courseTitle'].valueChanges
    //   .debounceTime(500)
    //   .subscribe(title => {
    //     this.couchService
    //       .post(`courses/_find`, this.searchQuery(title))
    //       .then(data => {
    //         if (data.docs.length === 0) {
    //           this.isUnique = true;
    //           return;
    //         }
    //         this.isUnique = false;
    //       });
    //   });
  }
}
