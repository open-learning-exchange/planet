import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent {

  event: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.event = this.data.event || {};
  }

}
