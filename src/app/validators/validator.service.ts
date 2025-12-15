import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable, timer, of } from 'rxjs';

import { findDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { switchMap, map, catchError } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { deepEqual } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
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
    { exceptions = [], opts = {}, selectors = {}, errorType = 'duplicate' } = { exceptions: [], opts: {}, selectors: {} }
  ): Observable<ValidationErrors | null> {
    if (exceptions.findIndex(exception => ac.value === exception) > -1) {
      return of(null);
    }
    selectors = { [fieldName]: { '$regex': `(?i)^\\s*${this.replaceSpecialChar(ac.value.trim())}\\s*$` }, ...selectors };
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => this.checkUnique$(dbName, selectors, opts)),
      map(exists => {
        if (exists) {
          return { [errorType]: true };
        }
        return null;
      })
    ).pipe(debug('Checking uniqueness of ' + fieldName + ' in ' + dbName));
  }

  public checkUniqueResourceTitle$(ac: AbstractControl, id: string, privateFor: any = null) {
    return timer(500).pipe(
      switchMap(
        () => this.couchService.get(`resources/_design/resources/_view/titles?key="${encodeURIComponent(ac.value.toLowerCase().trim())}"`)
      ),
      map(({ rows }) => {
        if (
          rows.length === 0 ||
          rows.every(({ id: rowId }) => rowId === id) ||
          rows.every(({ value }) => value && !deepEqual(value, privateFor))
        ) {
          return null;
        }
        return { duplicate: true };
      })
    );
  }

  /**
   * Used in isUnique() to replace special characters inputted in fields
   * @param fieldInput inputted field values
   */
  private replaceSpecialChar(fieldInput) {
    return fieldInput.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
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

}
