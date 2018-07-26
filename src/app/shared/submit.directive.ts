import { Directive, HostListener, Input, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsLoadingComponent } from './dialogs/dialogs-loading.component';

@Directive({
  selector: '[planetSubmit]'
})
export class SubmitDirective implements OnDestroy {

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

  ngOnDestroy() {
    this.spinnerDialog.close();
  }

}
