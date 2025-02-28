import { Injectable } from '@angular/core';
import { AuthService } from './auth-guard.service';
import { UserService } from './user.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BetaThenAuthService {

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (this.userService.isBetaEnabled() === true) {
      return of(true);
    }
    return this.authService.canActivateChild(route, state);
  }

}
