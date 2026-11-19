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

export const guardDialogClose = (
  dialogRef: MatDialogRef<unknown>, dialog: MatDialog, hasChanges: () => boolean,
  { close = () => dialogRef.close(), onEscape }: { close?: () => void, onEscape?: () => void } = {}
) => {
  const leave = () => leaveUnlessUnsaved(dialog, hasChanges, close);
  dialogRef.disableClose = true;
  dialogRef.backdropClick().subscribe(leave);
  dialogRef.keydownEvents().subscribe(event => {
    if (event.key === 'Escape' && !heldOpenDialogs.has(dialogRef)) {
      (onEscape ?? leave)();
    }
  });
  return leave;
};
