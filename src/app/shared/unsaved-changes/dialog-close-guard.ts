import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { UnsavedChangesPromptComponent } from './unsaved-changes-prompt.component';

// A fullscreen markdown editor holds its dialog here until its leaving Escape has passed,
// since that Escape still reaches the dialog's keydown listener.
export const heldOpenDialogs = new WeakSet<MatDialogRef<unknown>>();

export const closeUnlessUnsaved = (dialogRef: MatDialogRef<unknown>, dialog: MatDialog, hasChanges: () => boolean) => {
  if (!hasChanges()) {
    dialogRef.close();
    return;
  }
  UnsavedChangesPromptComponent.open(dialog).subscribe(confirmed => {
    if (confirmed) {
      dialogRef.close();
    }
  });
};

export const guardDialogClose = (dialogRef: MatDialogRef<unknown>, dialog: MatDialog, hasChanges: () => boolean) => {
  dialogRef.disableClose = true;
  dialogRef.backdropClick().subscribe(() => closeUnlessUnsaved(dialogRef, dialog, hasChanges));
  dialogRef.keydownEvents().subscribe(event => {
    if (event.key === 'Escape' && !heldOpenDialogs.has(dialogRef)) {
      closeUnlessUnsaved(dialogRef, dialog, hasChanges);
    }
  });
};
