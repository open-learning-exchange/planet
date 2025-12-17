import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { iif, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService } from './auth-guard.service';
import { UserService } from './user.service';
import { StateService } from './state.service';

/**
 * Guard that allows beta-enabled users to skip authentication while forcing
 * everyone else through the standard {@link AuthService} checks. To keep this
 * guard active, ensure `betaEnabled` is set to either `off` or `user` in the
 * configuration; setting it to `on` bypasses the auth flow entirely.
 */
@Injectable({
  providedIn: 'root'
})
export class BetaThenAuthService {

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private stateService: StateService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return iif(
      () => this.stateService.configuration?._id !== undefined,
      of(true),
      this.stateService.couchStateListener('configurations')
    ).pipe(switchMap((res) => {
      if (this.userService.isBetaEnabled() === true) {
        return of(true);
      }
      return this.authService.canActivateChild(route, state);
    }));
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivate(route, state);
  }

}
