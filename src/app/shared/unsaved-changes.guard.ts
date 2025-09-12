import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { UnsavedChangesPromptComponent } from './unsaved-changes.component';

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
  onLeaveConfirmed?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {

  constructor(
    private dialog: MatDialog
  ) {}

  canDeactivate(component: CanComponentDeactivate): Observable<boolean> | Promise<boolean> | boolean {
    // Only handle components that implement the CanComponentDeactivate interface properly
    if (component && component.canDeactivate) {
      const result = component.canDeactivate();

      // If component returns false (has unsaved changes), show dialog
      if (result === false) {
        const dialogResult = UnsavedChangesPromptComponent.open(this.dialog);
        return dialogResult.pipe(
          switchMap(confirmed => {
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
