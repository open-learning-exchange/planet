import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AuthService {

  constructor(private couchService: CouchService, private userService: UserService, private router: Router) {}

  private checkUser(url: any): Observable<boolean> {
    return this.couchService
      .get('_session', { withCredentials: true })
      .pipe(switchMap((res: any) => {
        if (res.userCtx.name) {
          // If user already matches one on the user service, do not make additional call to CouchDB
          if (res.userCtx.name === this.userService.get().name) {
            return of(true);
          }
          return this.userService.setUserConfigAndShelf(res.userCtx);
        }
        this.userService.unset();
        this.router.navigate([ '/login' ], { queryParams: { returnUrl: url }, replaceUrl: true });
        return of(false);
      }),
      map((isLoggedIn) => {
        return isLoggedIn;
      }));
  }

  // For main app (which requires login).  Uses canActivateChild to check on every route
  // change if session has expired
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkUser(state.url);
  }

  // For login route will redirect to main app if there is an active session
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.couchService.get('_session', { withCredentials: true }).pipe(map(res => {
      if (res.userCtx.name) {
        this.router.navigate([ '' ]);
        return false;
      }
      return true;
    }));
  }

}
