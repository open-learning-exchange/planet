import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './login.component.html',
  styleUrls: [ './login.scss' ]
})

export class LoginComponent implements OnInit {

  version: string = require( '../../../package.json').version;
  online = 'off';

  constructor(
    private couchService: CouchService,
    private router: Router
  ) { }

  ngOnInit() {
    // If not e2e tests, route to create user if there is no admin
    if (!environment.test) {
      this.checkAdminExistence().pipe(
        switchMap(noAdmin => {
          // false means there is admin
          if (noAdmin) {
            this.router.navigate([ '/login/configuration' ]);
            return of([]);
          }
          return this.couchService.allDocs('configurations');
        }),
        switchMap(data => {
          if (!data[0] || data[0].planetType === 'center') {
            return of(false);
          }
          return this.couchService.get('', { domain: data[0].parentDomain });
        })
      ).subscribe(data => { this.online = (data) ? 'on' : ''; });
    }
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs').pipe(
      tap((data) => {
        return true; // user can see data so there is no admin
      }),
      catchError((error) => {
        return of(false); // user doesn't have permission so there is an admin
      })
    );
  }

}
