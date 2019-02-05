import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable, timer, of } from 'rxjs';

import { findOneDocument, findDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap, map, catchError } from 'rxjs/operators';
import { debug } from '../debug-operator';

@Injectable()
export class ValidatorService {

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  public checkUnique$(db: string, selectors: any, opts = {}): Observable<boolean> {
    return this.couchService
      .post(`${db}/_find`, findDocuments(selectors, [ '_id' ], 0, 1), opts)
      .pipe(map(data => {
        return data.docs.length > 0;
      }));
  }

  public isUnique$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
    { exceptions = [], opts = {}, selectors = {} } = { exceptions: [], opts: {}, selectors: {} }
  ): Observable<ValidationErrors | null> {
    if (exceptions.findIndex(exception => ac.value === exception) > -1) {
      return of(null);
    }
    selectors = { [fieldName]: { '$regex': `(?i)^${ac.value}$` }, ...selectors };
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.checkUnique$(dbName, selectors, opts)),
      map(exists => {
        if (exists) {
          return { duplicate: true };
        }
        return null;
      })
    ).pipe(debug('Checking uniqueness of ' + fieldName + ' in ' + dbName));
  }

  public isNameAvailible$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
    id: string
  ): Observable<ValidationErrors | null> {
    return timer(500).pipe(
      switchMap(() => this.couchService.post(
        `${dbName}/_find`,
        findDocuments(
          { [fieldName] : ac.value },
          [ '_id', fieldName ]
        )
      )),
      map(exists => {
        if (exists.docs.length > 0) {
          return exists.docs.reduce((isMatch, c) => {
            if (id === c._id) {
              return null;
            }
            return isMatch;
          }, { duplicate: true });
        }
      })

    ).pipe(debug('Checking availibility of ' + fieldName + ' in ' + dbName));
  }

  public checkPassword$(ac: AbstractControl): Observable<boolean> {
    return this.couchService.post('_session', { 'name': this.userService.get().name, 'password': ac.value }, { withCredentials: false })
    .pipe(
      map(data => {
        return null;
      }),
      catchError(err => {
        return of({ invalidPassword: true });
      }));
  }

  public notDateInFuture$(ac: AbstractControl): Observable<ValidationErrors | null> {
    return this.couchService.currentTime().pipe(map(date => ac.value > date ? ({ invalidFutureDate: true }) : null));
  }

  public notDateInPast$(ac: AbstractControl): Observable<ValidationErrors | null> {
    return this.couchService.currentTime().pipe(map(date => ac.value > date ? null : ({ dateInPast: true })));
  }

}
