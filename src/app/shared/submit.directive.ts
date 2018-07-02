import { Directive, HostListener, Input } from '@angular/core';
import { MatDialog } from '@angular/material'
import { DialogsLoadingComponent } from './dialogs/dialogs-loading.component'

/*
 * TODO:
 * change planet-language module to planet-shared module
 * disable-close = true
 * closeOnNavigation = true
 */

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
/*
import { Directive, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material'
import { DialogsLoadingComponent } from './dialogs-loading.component'

@Directive({selector: '[planetSubmit]'})
export class PlanetSubmit {
  constructor(private dialog: MatDialog) { }

  @HostListener('click') onClick() {
      this.openDialog();
  }
  openDialog(): void {
    const dialogRef = this.dialog.open(DialogsLoadingComponent, {
      // width: '250px'
    });
  }
}
*/
