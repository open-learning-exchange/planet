import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { UserProfileDialogComponent } from './users-profile-dialog.component';

export interface UserProfileDialogData {
  member: any;
  dialogRef?: MatDialogRef<any>;
}

@Injectable({
  providedIn: 'root'
})
export class UsersProfileDialogService {

  constructor(private dialog: MatDialog) {}

  open(data: UserProfileDialogData, config: Omit<MatDialogConfig, 'data'> = {}) {
    return this.dialog.open(UserProfileDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      // A profile is taller than the dialog, so Material's default 'first-tabbable' scrolls
      // the content past the header on open. 'dialog' focuses the container instead, keeping
      // the top in view while still trapping focus. Every caller wants this, so it lives here.
      autoFocus: 'dialog',
      ...config,
      data
    });
  }

}
