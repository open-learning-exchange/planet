import { Injectable } from "@angular/core";
import { UserService } from "./user.service";
import { PouchAuthService } from "./database/pouch-auth.service";
import { StateService } from "./state.service";
import { switchMap } from "rxjs/operators";
import { of } from "rxjs";

// Guard simply ensures user data is fetched for application
@Injectable({ providedIn: 'root' }) 
export class UserGuard {

  constructor(
    private userService: UserService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService
  ) { }

  canActivateChild() {
    return this.pouchAuthService.getSessionInfo().pipe(
      switchMap((sessionInfo) => {
        const user = this.userService.get();
        if (sessionInfo.userCtx.name && sessionInfo.userCtx.name === user.name) {
          return of(true);
        }
        this.stateService.requestBaseData();
        return this.userService.setUserAndShelf(sessionInfo.userCtx);
      })
    );
  }

}