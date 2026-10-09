import { Injectable } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { PouchAuthService } from '@shared/database/pouch-auth.service';
import { StateService } from '@shared/state.service';

import { UserService } from './user.service';

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
