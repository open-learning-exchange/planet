import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { PouchAuthService } from './database/pouch-auth.service';
import { StateService } from './state.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

// Guard simply ensures user data is fetched for application
@Injectable({ providedIn: 'root' })
export class UserGuard {

  constructor(
    private userService: UserService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService
  ) { }

  skipNewUserRequests(userCtx, user) {
    return userCtx.name === undefined || userCtx.name === null ||
      (userCtx.name && userCtx.name === user.name);
  }

  canActivateChild() {
    return this.pouchAuthService.getSessionInfo().pipe(
      switchMap((sessionInfo) => {
        const user = this.userService.get();
        if (this.skipNewUserRequests(sessionInfo.userCtx, user)) {
          return of(true);
        }
        this.stateService.requestBaseData();
        return this.userService.setUserAndShelf(sessionInfo.userCtx);
      })
    );
  }

}
