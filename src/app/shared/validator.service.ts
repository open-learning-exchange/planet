import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
// Make sure not to import the entire rxjs library!!!
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { fromPromise } from 'rxjs/observable/fromPromise';

import { MongoQueries }  from './mongoQueries';
import { CouchService } from './couchdb.service';

import { switchMap, map } from 'rxjs/operators';

@Injectable()
export class ValidatorService {

constructor(private couchService: CouchService, private mongoQueries: MongoQueries) {}

  public CheckService$(db: string, field: string, value: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${db}/_find`, this.mongoQueries.findOneDocument(field, value))
      .then(data => {
        return (data.docs.length > 0);
      });
    return fromPromise(isDuplicate);
  }

  public isExists$(
    dbName: string,
    fieldName: string,
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    // mangoQueries.findOneDocument(1, 2)
    // calls service every .5s for input change
    return timer(500).pipe(
      switchMap(() => {
        return this.CheckService$(dbName,fieldName,ac.value).pipe(map(res => {
          if (res) {
            return { duplicate: true };
          }
          return null;
        }));
      })
    );
  }

}
