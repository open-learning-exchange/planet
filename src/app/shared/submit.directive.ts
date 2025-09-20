import { Directive, HostListener, Input, OnChanges, OnDestroy } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DialogsLoadingComponent } from './dialogs/dialogs-loading.component';

@Directive({
  selector: '[planetSubmit]'
})
export class SubmitDirective implements OnChanges, OnDestroy {

  constructor(public dialog: MatDialog) { }

  @Input('planetSubmit') validSubmit: boolean;
  spinnerDialog: MatDialogRef<DialogsLoadingComponent>;

  @HostListener('click') submit() {
    if (this.validSubmit) {
      this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
        disableClose: true
      });
    }
  }

  ngOnChanges() {
    if (this.validSubmit === false) {
      this.closeSpinner();
    }
  }

  ngOnDestroy() {
    this.closeSpinner();
  }

  closeSpinner() {
    for (const entry of this.dialog.openDialogs) {
      if (entry === this.spinnerDialog) {
        this.spinnerDialog.close();
      }
    }
  }

}
