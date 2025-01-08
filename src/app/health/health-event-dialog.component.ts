import { Component, Inject, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { Router } from '@angular/router';
import { timer, of, combineLatest } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { UsersService } from '../users/users.service';
import { CouchService } from '../shared/couchdb.service';
import { HealthService } from './health.service';
import { UserService } from '../shared/user.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog } from '@angular/material/dialog';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent implements OnInit, OnDestroy {

  event: any;
  hasConditionAndTreatment = false;
  @Output() examinationDeleted = new EventEmitter<string>();
  conditionAndTreatmentFields = conditionAndTreatmentFields;
  conditions: string;
  hasVital = false;
  canUpdate: any;
  performedBy = '';
  minutes: string;
  seconds: string;
  timeLimit = 300000;
  isDestroyed = false;
  deleteDialog: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private dialog: MatDialog,
    private usersService: UsersService,
    private couchService: CouchService,
    private userService: UserService,
    private healthService: HealthService,
    private planetMessageService: PlanetMessageService,
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

  openDeleteDialog(event) {
    const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteExamination(event),
        request: 'none',
        changeType: 'Cancel',
        type: `examination`,
        displayName: formattedDate
      }
    });
  }

  deleteExamination(event) {
    const {_id: eventId, _rev: eventRev} = event;
    return {
      request: this.healthService.deleteExamination(eventId, eventRev),
      onNext: () => {
        this.deleteDialog.close();
        this.dialog.closeAll();
        this.examinationDeleted.emit(eventId);
        this.planetMessageService.showMessage($localize`You have deleted this examination`);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this resource.`)
    };
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

}
