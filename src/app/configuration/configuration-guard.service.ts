import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ConfigurationGuard {

  constructor (
    private router: Router,
    private couchService: CouchService
  ) {}

  canActivate(): Observable<boolean> {
    return this.couchService.findAll('configurations').pipe(map((data: any[]) => {
      if (data.length > 0) {
        this.router.navigate([ '/login' ]);
      }
      return data.length === 0;
    }));
  }

}
