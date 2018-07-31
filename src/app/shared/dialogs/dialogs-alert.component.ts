import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './dialogs-alert.component.html'
})
export class DialogsAlertComponent {

  message = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  closeAlert() {
    this.message = '';
  }

}
