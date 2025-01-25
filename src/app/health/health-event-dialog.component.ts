import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { Router } from '@angular/router';
import { timer, of, combineLatest } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { UsersService } from '../users/users.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent implements OnInit, OnDestroy {

  event: any;
  events: any[] = [];
  additionalInfo: any = {};
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
  userDetail = this.userService.get();
  healthDetail: any = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private usersService: UsersService,
    private couchService: CouchService,
    private userService: UserService,
    private healthService: HealthService
  ) {
    this.event = this.data.event || {};
    this.healthDetail = data.healthDetail || {};
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

  initData() {
    this.healthService.getHealthData(this.userDetail._id).pipe(
      switchMap(([ { profile, events, userKey } ]: any[]) => {
        this.userDetail = { ...profile, ...this.userDetail };
        this.healthDetail = profile;
        this.events = events || [];
        return userKey
          ? this.couchService.findAll('health', { selector: { profileId: userKey } })
          : of([]);
      })
    ).subscribe(eventDocs => {
      this.events.push(...eventDocs);
      this.processEventData();
    });
  }

  processEventData() {
    this.additionalInfo = this.events.reduce((info, { date, selfExamination, conditions, hasInfo, ...event }) => ({
      ...info,
      [date]: {
        selfExamination,
        hasConditions: conditions && Object.values(conditions).some(Boolean),
        hasInfo: hasInfo === true || Object.entries(event).some(
          ([ key, value ]) => conditionAndTreatmentFields.includes(key) && value
        )
      }
    }), {});
  }

  isLastSection(section: string): boolean {
    const sections = [
      'notes',
      'diagnosis',
      'treatments',
      'medications',
      'immunizations',
      'allergies',
      'xrays',
      'tests',
      'referrals'
    ];
    const activeSections = sections.filter(sec => this.event[sec]);
    return activeSections[activeSections.length - 1] === section;
  }

  exportAsPDF() {
    const fullName = this.userDetail.firstName
      ? `${this.userDetail.firstName} ${this.userDetail.middleName || ''} ${this.userDetail.lastName || ''}`
      : 'N/A';
    const submissionDate = this.event.date ? new Date(this.event.date).toLocaleDateString() : 'N/A';
    const docDefinition: any = {
      content: [],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [ 0, 10, 0, 10 ]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [ 0, 10, 0, 5 ]
        },
        text: {
          fontSize: 12,
          margin: [ 0, 5, 0, 5 ]
        },
        small: {
          fontSize: 10
        }
      },
      defaultStyle: {
        columnGap: 10
      }
    };
    docDefinition.content.push({
      text: `Examination for ${fullName} submitted on ${submissionDate}`,
      style: 'header',
      alignment: 'center'
    });
    docDefinition.content.push({ text: 'General Information', style: 'subheader' });
    docDefinition.content.push({ text: `Name: ${fullName}`, style: 'text' });
    docDefinition.content.push({ text: `Date: ${submissionDate}`, style: 'text' });
    docDefinition.content.push({ text: `DOB: ${this.userDetail.birthDate ? new Date(this.userDetail.birthDate).toLocaleDateString() : 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Email: ${this.userDetail.email || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Phone: ${this.userDetail.phoneNumber || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Language: ${this.userDetail.language || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Birthplace: ${this.userDetail.birthplace || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: 'Emergency Contact', style: 'subheader' });
    docDefinition.content.push({ text: `Name: ${this.healthDetail?.emergencyContactName || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Type: ${this.healthDetail?.emergencyContactType || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: `Contact: ${this.healthDetail?.emergencyContact || 'N/A'}`, style: 'text' });
    docDefinition.content.push({ text: 'Special Needs', style: 'subheader' });
    docDefinition.content.push({ text: this.healthDetail?.specialNeeds || 'N/A', style: 'text' });
    docDefinition.content.push({ text: 'Notes', style: 'subheader' });
    docDefinition.content.push({ text: this.healthDetail?.notes || 'N/A', style: 'text' });
    if (this.hasVital) {
      docDefinition.content.push({ text: 'Vitals', style: 'subheader' });
      if (this.event.temperature) { docDefinition.content.push({ text: `Temperature: ${this.event.temperature} °C`, style: 'text' }); }
      if (this.event.pulse) { docDefinition.content.push({ text: `Pulse: ${this.event.pulse} bpm`, style: 'text' }); }
      if (this.event.bp) { docDefinition.content.push({ text: `Blood Pressure: ${this.event.bp}`, style: 'text' }); }
      if (this.event.height) { docDefinition.content.push({ text: `Height: ${this.event.height} cm`, style: 'text' }); }
      if (this.event.weight) { docDefinition.content.push({ text: `Weight: ${this.event.weight} kg`, style: 'text' }); }
      if (this.event.vision) { docDefinition.content.push({ text: `Vision: ${this.event.vision}`, style: 'text' }); }
      if (this.event.hearing) { docDefinition.content.push({ text: `Hearing: ${this.event.hearing}`, style: 'text' }); }
    }
    if (this.conditions) {
      docDefinition.content.push({ text: 'Conditions', style: 'subheader' });
      docDefinition.content.push({ text: this.conditions, style: 'text' });
    }
    const details = [
      { label: 'Observations & Notes', value: this.event.notes },
      { label: 'Diagnosis', value: this.event.diagnosis },
      { label: 'Treatments', value: this.event.treatments },
      { label: 'Medications', value: this.event.medications },
      { label: 'Immunizations', value: this.event.immunizations },
      { label: 'Allergies', value: this.event.allergies },
      { label: 'X-rays', value: this.event.xrays },
      { label: 'Lab Tests', value: this.event.tests },
      { label: 'Referrals', value: this.event.referrals }
    ];
    details.forEach(detail => {
      if (detail.value) {
        docDefinition.content.push({ text: detail.label, style: 'subheader' });
        docDefinition.content.push({ text: detail.value, style: 'text' });
      }
    });
    pdfMake.createPdf(docDefinition).download('Examination_Report.pdf');
  }

}
