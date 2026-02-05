import { Injectable } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsLoadingComponent } from './dialogs-loading.component';

@Injectable({
  'providedIn': 'root'
})
export class DialogsLoadingService {

  spinnerDialog: MatDialogRef<DialogsLoadingComponent>;
  isSpinnerOn = false;
  private requestCount = 0;

  constructor(
    private dialog: MatDialog
  ) {}

  start() {
    this.requestCount++;
    if (!this.isSpinnerOn) {
      this.isSpinnerOn = true;
      this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
        disableClose: true
      });
    }
  }

  stop() {
    if (this.requestCount > 0) {
      this.requestCount--;
    }

    if (this.requestCount === 0 && this.isSpinnerOn && this.spinnerDialog) {
      this.spinnerDialog.close();
      this.isSpinnerOn = false;
    }
  }

}
