import { Injectable } from '@angular/core';

import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { UnsavedChangesPromptComponent } from './unsaved-changes.component';

export interface CanComponentDeactivate {
  canDeactivate: (
    currentRoute?: ActivatedRouteSnapshot,
    currentState?: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ) => Observable<boolean> | Promise<boolean> | boolean;
  onLeaveConfirmed?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard {

  constructor(
    private dialog: MatDialog
  ) {}

  canDeactivate(
    component: CanComponentDeactivate,
    currentRoute?: ActivatedRouteSnapshot,
    currentState?: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Only handle components that implement the CanComponentDeactivate interface properly
    if (component && component.canDeactivate) {
      const result = component.canDeactivate(currentRoute, currentState, nextState);

      // If component returns false (has unsaved changes), show dialog
      if (result === false) {
        const dialogResult = UnsavedChangesPromptComponent.open(this.dialog);
        return dialogResult.pipe(
          switchMap(dialogResponse => {
            const confirmed = dialogResponse === true;
            if (confirmed && component.onLeaveConfirmed) {
              component.onLeaveConfirmed();
            }
            return of(confirmed);
          })
        );
      }

      return result;
    }

    return true;
  }
}
