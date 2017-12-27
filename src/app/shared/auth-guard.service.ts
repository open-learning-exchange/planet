import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AuthService {

  constructor(private couchService: CouchService, private userService: UserService, private router: Router) {}

  private checkUser(url: any): Observable<boolean> {
    return this.couchService
      .get('_session', { withCredentials: true })
      .pipe(map((res: any) => {
        if (res.userCtx.name) {
          this.userService.set(res.userCtx);
          return true;
        }
        this.router.navigate([ '/login' ], { queryParams: { returnUrl: url }, replaceUrl: true });
        return false;
      }));
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkUser(state.url);
  }

}
