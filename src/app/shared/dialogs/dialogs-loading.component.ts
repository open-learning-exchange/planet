import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';

@Component({
  templateUrl: './dialogs-loading.component.html',
  styles: [ `
    .logo-spinner {
      animation: loading-icon-linear-rotate 4s linear infinite;
    }
    @keyframes loading-icon-linear-rotate {
      0% { transform: rotate(0); }
      100% { transform: rotate(360deg); }
    }
  ` ]
})

export class DialogsLoadingComponent {
  constructor(public dialogRef:
    MatDialogRef<DialogsLoadingComponent>) { }
}
