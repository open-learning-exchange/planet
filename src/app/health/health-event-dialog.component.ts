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

}
