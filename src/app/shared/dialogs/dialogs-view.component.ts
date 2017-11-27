import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
@Component({
  templateUrl: './dialogs-view.component.html',
  styles: [ `
  	.field-details {
      width: 100%;
    }
    .field-form {
	  min-width: 150px;
	  max-width: 500px;
	  width: 100%;
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
