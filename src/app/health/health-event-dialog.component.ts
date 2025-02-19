import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { Router } from '@angular/router';
import { timer, of, combineLatest } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { UsersService } from '../users/users.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent implements OnInit, OnDestroy {

  event: any;
  hasConditionAndTreatment = false;
  conditionAndTreatmentFields = conditionAndTreatmentFields;
  conditions: string;
  hasVital = false;
  canUpdate: any;
  performedBy = '';
  minutes: string;
  seconds: string;
  timeLimit = 300000;
  isDestroyed = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private usersService: UsersService,
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.event = this.data.event || {};
    this.conditions = Object.entries(this.event.conditions || {})
      .filter(([ condition, active ]) => active).map(([ condition, active ]) => condition).sort().join(', ');
    this.hasConditionAndTreatment = this.event.hasInfo !== undefined ?
      this.event.hasInfo === true :
      this.conditionAndTreatmentFields.some(field => this.event[field] !== '');
    this.hasVital = vitals.some(vital => this.event[vital]);
    this.editButtonCountdown();
  }

  ngOnInit() {
    this.usersService.usersListener(true).subscribe(users => {
      const user = users.find(u => u._id === this.event.createdBy);
      this.performedBy = user.fullName;
    });
    if (!this.event.selfExamination) {
      this.usersService.requestUsers();
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }

  editExam(event) {
    this.router.navigate([ 'event', { id: this.data.user, eventId: event._id } ], { relativeTo: this.data.route });
  }

  editButtonCountdown() {
    this.couchService.currentTime().pipe(
      switchMap((currentTime: number) => combineLatest(of(currentTime), timer(0, 1000))),
      takeWhile(([ time, seconds ]) => {
        const millisecondsLeft = this.timeLimit + this.event.updatedDate - ((seconds * 1000) + time);
        this.setTimerValue(millisecondsLeft / 1000);
        return millisecondsLeft > 0 && this.event.createdBy === this.userService.get()._id && !this.isDestroyed;
      })
    ).subscribe(() => this.canUpdate = true, () => {}, () => this.canUpdate = false);
  }

  setTimerValue(secondsLeft) {
    const seconds = Math.floor(secondsLeft % 60).toString();
    this.minutes = Math.floor(secondsLeft / 60).toString();
    this.seconds = parseInt(seconds, 10) < 10 ? '0' + seconds : seconds;
  }

  exportToPdf(event) {
    const documentDefinition = {
      content: [
        { text: `Health examination on ${new Date(event.date).toLocaleDateString()}`, style: 'header' },
        { text: [ { text: 'Performed by: ', bold: true }, `${event.selfExamination ? 'Self' : this.performedBy}` ], style: 'subheader' },
        { text: 'Vitals', style: 'sectionHeader' },
        { text: [ { text: 'Temperature: ', bold: true }, event.temperature ? `${event.temperature} °C` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Pulse: ', bold: true }, event.pulse ? `${event.pulse} bpm` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Blood Pressure: ', bold: true }, event.bp ? `${event.bp}` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Height: ', bold: true }, event.height ? `${event.height} cm` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Weight: ', bold: true }, event.weight ? `${event.weight} kg` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Vision: ', bold: true }, event.vision ? `${event.vision}` : 'N/A' ], style: 'content' },
        { text: [ { text: 'Hearing: ', bold: true }, event.hearing ? `${event.hearing}` : 'N/A' ], style: 'content' },
        { text: '\nConditions', style: 'sectionHeader' },
        { text: this.conditions || 'N/A', style: 'content' },
        { text: '\nOther Notes', style: 'sectionHeader' },
        { text: [ { text: 'Observations & Notes: ', bold: true }, `${event.notes || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Diagnosis: ', bold: true }, `${event.diagnosis || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Treatments: ', bold: true }, `${event.treatments || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Medications: ', bold: true }, `${event.medications || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Immunizations: ', bold: true }, `${event.immunizations || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'X-rays: ', bold: true }, `${event.xrays || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Lab Tests: ', bold: true }, `${event.tests || 'N/A'}` ], style: 'content' },
        { text: [ { text: 'Referrals: ', bold: true }, `${event.referrals || 'N/A'}` ], style: 'content' }
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, margin: [ 0, 10, 0, 5 ] },
        sectionHeader: { fontSize: 16, bold: true, margin: [ 0, 10, 0, 5 ] },
        content: { fontSize: 12, margin: [ 0, 2, 0, 2 ] }
      }
    };
    pdfMake.createPdf(documentDefinition).download(`health_event_${event.date}.pdf`);
  }

}
