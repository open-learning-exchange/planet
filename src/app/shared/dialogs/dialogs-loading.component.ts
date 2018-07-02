import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';

@Component({
  selector: 'dialogs-loading',
  templateUrl: './dialogs-loading.component.html'
})

export class DialogsLoadingComponent {
  constructor(public dialogRef:
    MatDialogRef<DialogsLoadingComponent>) { }
}