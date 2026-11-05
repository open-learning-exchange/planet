import { Injectable } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { DialogsLoadingComponent } from './dialogs-loading.component';

@Injectable({
  providedIn: 'root'
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
      const spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
        disableClose: true
      });
      this.spinnerDialog = spinnerDialog;
      // Back and forward close every dialog, this one included: forget its count so the next start() reopens it. Requests keep running
      spinnerDialog.afterClosed().subscribe(() => {
        if (this.spinnerDialog === spinnerDialog && this.isSpinnerOn) {
          this.isSpinnerOn = false;
          this.requestCount = 0;
        }
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
