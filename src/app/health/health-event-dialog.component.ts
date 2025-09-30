import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { Router } from '@angular/router';
import { timer, of, combineLatest } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { UsersService } from '../users/users.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { loadPdfMake } from '../shared/utils';

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

  async exportToPdf(event) {
    const pdfMake = await loadPdfMake();
    const documentDefinition = {
      content: [
        { text: `Health examination on ${new Date(event.date).toLocaleDateString()}`, style: 'header' },
        { canvas: [ { type: 'line', x1: 0, y1: 5, x2: 595, y2: 5, lineWidth: 1 } ] },
        { text: 'Performed by', style: 'sectionHeader' },
        { text: `${event.selfExamination ? 'Self' : this.performedBy}`, style: 'subheader' },
        { text: 'Vitals', style: 'sectionHeader' },
        event.temperature ? { text: [ { text: 'Temperature: ', bold: true }, `${event.temperature} °C` ], style: 'content' } : '',
        event.pulse ? { text: [ { text: 'Pulse: ', bold: true }, `${event.pulse} bpm` ], style: 'content' } : '',
        event.bp ? { text: [ { text: 'Blood Pressure: ', bold: true }, `${event.bp}` ], style: 'content' } : '',
        event.height ? { text: [ { text: 'Height: ', bold: true }, `${event.height} cm` ], style: 'content' } : '',
        event.weight ? { text: [ { text: 'Weight: ', bold: true }, `${event.weight} kg` ], style: 'content' } : '',
        event.vision ? { text: [ { text: 'Vision: ', bold: true }, `${event.vision}` ], style: 'content' } : '',
        event.hearing ? { text: [ { text: 'Hearing: ', bold: true }, `${event.hearing}` ], style: 'content' } : '',
        this.conditions ? { text: '\nConditions', style: 'sectionHeader' } : '',
        this.conditions ? { text: this.conditions, style: 'content' } : '',
        { text: '\nOther Notes', style: 'sectionHeader' },
        event.notes ? { text: 'Observations & Notes:', style: 'subheaderBold' } : '',
        event.notes ? { text: event.notes, style: 'content' } : '',
        event.diagnosis ? { text: 'Diagnosis:', style: 'subheaderBold' } : '',
        event.diagnosis ? { text: event.diagnosis, style: 'content' } : '',
        event.treatments ? { text: 'Treatments:', style: 'subheaderBold' } : '',
        event.treatments ? { text: event.treatments, style: 'content' } : '',
        event.medications ? { text: 'Medications:', style: 'subheaderBold' } : '',
        event.medications ? { text: event.medications, style: 'content' } : '',
        event.immunizations ? { text: 'Immunizations:', style: 'subheaderBold' } : '',
        event.immunizations ? { text: event.immunizations, style: 'content' } : '',
        event.xrays ? { text: 'X-rays:', style: 'subheaderBold' } : '',
        event.xrays ? { text: event.xrays, style: 'content' } : '',
        event.tests ? { text: 'Lab Tests:', style: 'subheaderBold' } : '',
        event.tests ? { text: event.tests, style: 'content' } : '',
        event.referrals ? { text: 'Referrals:', style: 'subheaderBold' } : '',
        event.referrals ? { text: event.referrals, style: 'content' } : ''
      ].filter(Boolean),
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, margin: [ 0, 10, 0, 5 ] },
        subheaderBold: { fontSize: 14, bold: true, margin: [ 0, 10, 0, 5 ] },
        sectionHeader: { fontSize: 16, bold: true, margin: [ 0, 10, 0, 5 ] },
        content: { fontSize: 12, margin: [ 0, 2, 0, 2 ] }
      }
    };
    pdfMake.createPdf(documentDefinition).download(`health_event_${event.date}.pdf`);
  }

}
