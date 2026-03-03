import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: './dialogs-loading.component.html',
  styles: [ `
    :host {
      display: grid;
      align-items: center;
      justify-items: center;
      overflow: hidden;
      grid-template-rows: 1fr 200px;
      grid-template-columns: 200px;
      padding: 24px;
    }
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
