import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PouchAuthService } from './database/pouch-auth.service';
import { MatDialog } from '@angular/material/dialog';
import { LoginDialogComponent } from '../login/login-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private userService: UserService,
    private router: Router,
    private pouchAuthService: PouchAuthService,
    private dialog: MatDialog
  ) { }

  private getSession$() {
    return this.pouchAuthService.getSessionInfo();
  }

  private checkUser(url: any, roles: any[]): Observable<boolean> {
    return this.getSession$().pipe(
      switchMap((sessionInfo) => {
        if (sessionInfo.userCtx.name) {
          // User should be set on user-guard. If app user doesn't match session, boot to login
          const user = this.userService.get();
          if (sessionInfo.userCtx.name === user.name) {
            if (roles.length > 0) {
              const hasRole = roles.some(role => user.roles.includes(role));
              return hasRole ? of(true) : of(false);
            }
            return of(true);
          }
        }
        this.userService.unset();
        if (this.userService.isBetaEnabled()) {
          const dialogRef = this.dialog.open(LoginDialogComponent);
          return dialogRef.afterClosed().pipe(switchMap(() => {
            return this.checkUser(url, roles);
          }));
        }
        const returnUrl = url === '/' ? null : url;
        this.router.navigate([ '/login' ], { queryParams: { returnUrl }, replaceUrl: true });
      }),
      map(isLoggedIn => {
        return isLoggedIn;
      })
    );
  }

  // For main app (which requires login).  Uses canActivateChild to check on every route
  // change if session has expired
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    let currentRoute: ActivatedRouteSnapshot | null = route;
    const roles: Array<string> = currentRoute.data?.roles ?? [];
    while (currentRoute) {
      if (currentRoute.data && currentRoute.data.requiresAuth === false) {
        return of(true);
      }
      currentRoute = currentRoute.parent;
    }
    return this.checkUser(state.url, roles);
  }

  // For login route will redirect to main app if there is an active session
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.getSession$().pipe(
      map((sessionInfo) => {
        if (sessionInfo.userCtx.name) {
          this.router.navigate([ '' ]);
          return false;
        }
        return true;
      })
    );
  }

  checkAuthenticationStatus(): Observable<void> {
    return this.getSession$().pipe(
      map(sessionInfo => {
        const isLoggedIn = !!sessionInfo.userCtx.name;
        if (!isLoggedIn) {
          throw new Error('Not authorized');
        }
      })
    );
  }

}
