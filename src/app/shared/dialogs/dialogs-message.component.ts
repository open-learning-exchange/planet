import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './dialogs-message.component.html',
  styles: [ `
    .mat-input-element:disabled {
      color: rgba(3, 0, 0, 0.92);
    }
    .close {
      margin-left: 220px;
    }
  ` ]
})
export class DialogsMessageComponent {

  message = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any ) {
    // Support dialogs created before the amount field was added
  }

}
