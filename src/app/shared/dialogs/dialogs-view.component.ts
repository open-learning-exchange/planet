import { Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
@Component({
  templateUrl: './dialogs-view.component.html',
  styles: [ `
  	.close {
      float: right;
    }
    .content {
      max-height: 55vh;
      overflow-y: auto;
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
