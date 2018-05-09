import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
@Component({
  templateUrl: './dialogs-view.component.html',
  styles: [ `
  	.close {
      float: right;
    }
  ` ]
})
export class DialogsViewComponent {
  message = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  closeAlert() {
    this.message = '';
  }

}
