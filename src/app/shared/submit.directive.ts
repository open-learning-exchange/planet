import { Directive, HostListener, Input } from '@angular/core';
import { MatDialog } from '@angular/material'
import { DialogsLoadingComponent } from './dialogs/dialogs-loading.component'

@Directive({
  selector: '[planetSubmit]'
})

export class SubmitDirective {

  constructor(public dialog: MatDialog) { }

  @Input('planetSubmit') validSubmit: boolean;

  @HostListener('click') submit() {
    if (this.validSubmit) {
      let dialogRef = this.dialog.open(DialogsLoadingComponent, { });
      dialogRef.disableClose = true;
      dialogRef.closeOnNavigation = true;
      console.log(dialogRef);
    }
  }
}
