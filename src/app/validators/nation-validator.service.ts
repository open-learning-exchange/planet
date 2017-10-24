import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import searchDocuments from '../courses/constants';
import { CouchService } from '../shared/couchdb.service';

@Injectable()
export class NationValidatorService {
  readonly dbName = 'nations';

  constructor(private couchService: CouchService) {}
    public nationCheckerService$(name: string): Observable<boolean> {
      const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, searchDocuments('name', name))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
      return Observable.fromPromise(isDuplicate);
    }
    public checkNationExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    const errMessage = {
      duplicateCourse: { message: 'Nation already exists' }
    };
    // calls service every .5s for input change
    return Observable.timer(500).switchMap(() => {
      return this.nationCheckerService$(ac.value).map(res => {
        if (res) {
          return errMessage;
        }
        return null;
      });
    });;
  }

}
