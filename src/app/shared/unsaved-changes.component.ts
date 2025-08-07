import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsPromptComponent } from './dialogs/dialogs-prompt.component';

export const warningMsg = $localize`You have unsaved changes. Are you sure you want to leave?`;

@Component({
  template: ''
})
export class UnsavedChangesPromptComponent {
  static open(dialog: MatDialog) {
    const dialogRef = dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'exit',
        type: 'changes',
        cancelable: true,
        okClick: {
          request: new Observable(observer => {
            observer.next(true);
            observer.complete();
          }),
          onNext: () => dialogRef.close(true),
          onError: () => dialogRef.close(false)
        }
      }
    });
    return dialogRef.afterClosed();
  }
}
