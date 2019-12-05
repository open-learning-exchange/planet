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
  conditions: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.event = this.data.event || {};
    this.conditions = Object.entries(this.event.conditions || {})
      .filter(([ condition, active ]) => active).map(([ condition, active ]) => condition).join(', ');
    this.hasConditionAndTreatment = this.conditionAndTreatmentFields.some(field => this.event[field] !== '');
  }

}
