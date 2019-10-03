import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent {

  event: any;
  hasConditionAndTreatment = false;
  private conditionAndTreatmentFields = [
    'notes', 'diagnosis', 'treatments', 'medications', 'immunizations', 'allergies', 'xrays', 'tests', 'referrals'
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.event = this.data.event || {};
    this.hasConditionAndTreatment = this.conditionAndTreatmentFields.some(field => this.event[field] !== '');
  }

}
