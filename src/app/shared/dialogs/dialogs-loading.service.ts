import { Injectable } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
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
      this.isSpinnerOn = true;
      this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
        disableClose: true
      });
    }
  }

  stop() {
    if (this.spinnerDialog !== undefined) {
      this.spinnerDialog.close();
      this.isSpinnerOn = false;
    }
  }

}
