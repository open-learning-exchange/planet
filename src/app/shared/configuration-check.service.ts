import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { CouchService } from './couchdb.service';
import { of } from 'rxjs';
import { switchMap, catchError, map, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationCheckService {
  online = 'off';

  constructor(
    private couchService: CouchService,
    private router: Router
  ) {}

  checkConfiguration() {
    // If not e2e tests, route to create user if there is no admin
    if (!environment.test) {
      return this.checkAdminExistence().pipe(
        switchMap(noAdmin => {
          // false means there is admin
          if (noAdmin) {
            if (this.router.url !== '/login/migration') {
              this.router.navigate([ '/login/configuration' ]);
            }
            return of([]);
          }
          return this.couchService.findAll('configurations');
        }),
        switchMap((data: any) => {
          if (!data[0] || data[0].planetType === 'center') {
            return of(false);
          }
          return this.couchService.get('', { domain: data[0].parentDomain }).pipe(
            timeout(3000),
            catchError(() => of(false))
          );
        }),
        map(data => {
          this.online = (data) ? 'on' : 'off';
          return this.online;
        })
      );
    }
    return of(undefined);
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs', {
      params: new HttpParams()
        .set('limit', '1')
        .set('include_docs', 'false')
    }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

}
