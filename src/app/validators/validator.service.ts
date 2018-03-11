import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';

import { findOneDocument, findDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

import { switchMap, map } from 'rxjs/operators';

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
// isNameAvailible is broken
  public isNameAvailible$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl,
    courseId: string
  ): Observable<ValidationErrors | null> {
    return timer(500).pipe(
      switchMap(() => this.couchService.post(
        `${dbName}/_find`,
        findDocuments(
          { 'courseTitle' : ac.value },
          [ '_id', 'courseTitle' ]
        )
      )),
      map(exists => {
        if (exists.docs.length > 0) {
          exists.docs.map((c) => {
            if (courseId === c._id) {
              return null;
            } else {
              return { duplicate: true };
            }
          })
        }
        return null;
      })
    ).debug('Checking availibility of ' + fieldName + ' in ' + dbName);
  }

}