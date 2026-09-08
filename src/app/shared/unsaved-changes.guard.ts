import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DialogsPromptService } from './dialogs/dialogs-prompt.service';

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
  onLeaveConfirmed?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard  {

  constructor(
    private dialogsPromptService: DialogsPromptService
  ) {}

  canDeactivate(component: CanComponentDeactivate): Observable<boolean> | Promise<boolean> | boolean {
    // Only handle components that implement the CanComponentDeactivate interface properly
    if (component && component.canDeactivate) {
      const result = component.canDeactivate();

      // If component returns false (has unsaved changes), show dialog
      if (result === false) {
        return this.dialogsPromptService.confirmUnsavedChanges().pipe(
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
