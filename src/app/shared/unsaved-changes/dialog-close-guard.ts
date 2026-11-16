import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { UnsavedChangesPromptComponent } from './unsaved-changes-prompt.component';

// Dialogs a fullscreen editor holds until the Escape that leaves fullscreen has passed their keydown listener.
export const heldOpenDialogs = new WeakSet<MatDialogRef<unknown>>();

export const leaveUnlessUnsaved = (dialog: MatDialog, hasChanges: () => boolean, leave: () => void) => {
  if (!hasChanges()) {
    leave();
    return;
  }
  UnsavedChangesPromptComponent.open(dialog).subscribe(confirmed => {
    if (confirmed) {
      leave();
    }
  });
};

export const closeUnlessUnsaved = (dialogRef: MatDialogRef<unknown>, dialog: MatDialog, hasChanges: () => boolean) =>
  leaveUnlessUnsaved(dialog, hasChanges, () => dialogRef.close());

export const guardDialogClose = (
  dialogRef: MatDialogRef<unknown>, dialog: MatDialog, hasChanges: () => boolean, onEscape?: () => void
) => {
  dialogRef.disableClose = true;
  dialogRef.backdropClick().subscribe(() => closeUnlessUnsaved(dialogRef, dialog, hasChanges));
  dialogRef.keydownEvents().subscribe(event => {
    if (event.key === 'Escape' && !heldOpenDialogs.has(dialogRef)) {
      (onEscape ?? (() => closeUnlessUnsaved(dialogRef, dialog, hasChanges)))();
    }
  });
};
