import { Injectable } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material';
import { DialogsLoadingComponent } from './dialogs-loading.component';

@Injectable({
  'providedIn': 'root'
})
export class DialogsLoadingService {

  spinnerDialog: MatDialogRef<DialogsLoadingComponent>;
  isSpinnerOn = false;

  constructor(
    private dialog: MatDialog
  ) {}

  start() {
    if (!this.isSpinnerOn) {
      this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
        disableClose: true
      });
    }
  }

  stop() {
    this.isSpinnerOn = false;
    this.spinnerDialog.close();
  }

}
