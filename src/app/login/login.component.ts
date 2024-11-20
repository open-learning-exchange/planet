import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  templateUrl: './login.component.html',
  styleUrls: [ './login.scss' ]
})

export class LoginComponent implements OnInit {

  online = 'off';
  planetVersion: string;

  constructor(
    private couchService: CouchService,
    private router: Router
  ) {}

  ngOnInit() {
    this.getPlanetVersion();
    // If not e2e tests, route to create user if there is no admin
    if (!environment.test) {
      this.checkAdminExistence().pipe(
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

  getPlanetVersion() {
    const opts = { responseType: 'text', withCredentials: false, headers: { 'Content-Type': 'text/plain' } };
    this.couchService.getUrl('version', opts).pipe(catchError(() => of(require('../../../package.json').version)))
      .subscribe((version: string) => this.planetVersion = version);
  }

}
