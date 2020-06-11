import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { HealthService } from './health.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent {

  event: any;
  hasConditionAndTreatment = false;
  conditionAndTreatmentFields = conditionAndTreatmentFields;
  conditions: string;
  hasVital = false;
  canUpdate: any;
  performedBy = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router
  ) {
    this.event = this.data.event || {};
    this.canUpdate = (new Date(Date.now()).getTime() - new Date(this.event.date).getTime()) <= 300000,
    this.conditions = Object.entries(this.event.conditions || {})
      .filter(([ condition, active ]) => active).map(([ condition, active ]) => condition).sort().join(', ');
    this.hasConditionAndTreatment = this.event.hasInfo !== undefined ?
      this.event.hasInfo === true :
      this.conditionAndTreatmentFields.some(field => this.event[field] !== '');
    this.hasVital = vitals.some(vital => this.event[vital]);
    this.performedBy = this.event.createdBy.substring(this.event.createdBy.indexOf(':') + 1);
  }

  editExam(event) {
    this.router.navigate([ 'event', { id: this.data.user, eventId: event._id } ], { relativeTo: this.data.route });
  }

}
