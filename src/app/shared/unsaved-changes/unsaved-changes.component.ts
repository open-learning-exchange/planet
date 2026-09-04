import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';

export const warningMsg = $localize`You have unsaved changes. Are you sure you want to leave?`;

@Component({
  template: '',
  standalone: false
})
export class UnsavedChangesPromptComponent {
  // data overrides the defaults below, i.e. to name the thing being left or add a message
  static open(dialog: MatDialog, data: any = {}) {
    const dialogRef = dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'exit',
        type: 'changes',
        cancelable: true,
        ...data
      }
    });
    return dialogRef.afterClosed();
  }
}
