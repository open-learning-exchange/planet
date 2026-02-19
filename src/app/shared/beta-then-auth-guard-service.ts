/**
 * ARCHIVAL CODE - Not currently in use
 *
 * This guard was used historically to allow pages like /community
 * to be publicly accessible without authentication while still requiring auth for non-beta users.
 *
 */

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { iif, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService } from './auth-guard.service';
import { UserService } from './user.service';
import { StateService } from './state.service';

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

}
