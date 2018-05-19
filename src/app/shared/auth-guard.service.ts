import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';
import { UserService } from './user.service';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { switchMap, map } from 'rxjs/operators';
import { AuthService as PouchDBAuthService } from './services';

import {
  Router,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

@Injectable()
export class AuthService {
  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private authService: PouchDBAuthService
  ) {}

  private checkUser(url: any): Observable<boolean> {
    return this.authService.getSessionInfo().pipe(
      switchMap(res => {
        if (res.userCtx.name) {
          if (res.userCtx.name === this.userService.get().name) {
            return of(true);
          }
          return this.userService.setUserConfigAndShelf(res.userCtx);
        }
        this.userService.unset();
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: url },
          replaceUrl: true
        });
        return of(false);
      }),
      map(isLoggedIn => {
        return isLoggedIn;
      })
    );
  }

  // For main app (which requires login).  Uses canActivateChild to check on every route
  // change if session has expired
  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkUser(state.url);
  }

  // For login route will redirect to main app if there is an active session
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.getSessionInfo().pipe(
      map(res => {
        if (res.userCtx.name) {
          this.router.navigate(['']);
          return false;
        }
        return true;
      })
    );
  }
}
