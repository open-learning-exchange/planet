import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { HealthEventDialogComponent } from './health-event-dialog.component';
import { environment } from '../../environments/environment';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { conditionAndTreatmentFields } from './health.constants';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { SelectionModel } from '@angular/cdk/collections';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './health.component.html',
  styleUrls: [ './health.scss' ]
})
export class HealthComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('examsTable') examsTable: ElementRef;
  userDetail = this.userService.get();
  healthDetail: any = {};
  events: any[] = [];
  eventTable = new MatTableDataSource();
  displayedColumns: string[] = [];
  additionalInfo: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + '/_users/';
  initializeEvents = true;
  isWaitingForEvents = true;
  isOwnUser = true;
  onDestroy$ = new Subject<void>();
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  message = '';

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).pipe(switchMap((params: ParamMap) => {
      const id = `org.couchdb.user:${params.get('id')}`;
      this.isOwnUser = params.get('id') === null || params.get('id') === this.userService.get().name;
      return params.get('id') ? this.couchService.get(`_users/${id}`) : of(this.userService.get());
    })).subscribe((user) => {
      this.userDetail = user;
      this.initData();
    });
  }

  ngAfterViewChecked() {
    if (this.initializeEvents === false || this.isWaitingForEvents === true || this.examsTable === undefined) {
      return;
    }
    this.initializeEvents = false;
    this.examsTable.nativeElement.scrollLeft = this.examsTable.nativeElement.scrollWidth - this.examsTable.nativeElement.clientWidth;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initData() {
    this.healthService.getHealthData(this.userDetail._id).pipe(
      switchMap(([ { profile, events, userKey } ]: any[]) => {
        this.userDetail = { ...profile, ...this.userDetail };
        if (this.userDetail._attachments) {
          this.imageSrc = `${this.urlPrefix}/${this.userDetail._id}/${Object.keys(this.userDetail._attachments)[0]}`;
        }
        this.healthDetail = profile;
        this.events = events || [];
        return userKey ? this.couchService.findAll('health', findDocuments({ profileId: userKey })) : of([]);
      })
    ).subscribe(eventDocs => {
      this.events = [ ...this.events, ...eventDocs ];
      this.setEventData();
    });
  }

  goBack() {
    if (this.router.url.indexOf('profile') === -1) {
      this.router.navigate([ '..' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    }
  }

  examClick(eventDate) {
    if (eventDate !== 'label') {
      const event = this.events.find(e => e.date === +eventDate);
      (event._id ?
        this.healthService.getHealthData(this.userDetail._id, { docId: event._id })
        : of([ event ])
      ).subscribe(([ eventDoc ]) => {
        this.dialog.open(HealthEventDialogComponent, {
          data: { event: eventDoc, user: this.userDetail._id, route: this.route },
          width: '50vw',
          maxHeight: '90vh'
        });
      });
    }
  }

  setEventData() {
    this.eventTable.data = this.events
      .sort((a, b) => a.date - b.date)
      .reduce((eventRows, event) => eventRows.map(item => ({ ...item, [event.date]: event[item.label] })), [
        { label: 'temperature' }, { label: 'pulse' }, { label: 'bp' }, { label: 'height' },
        { label: 'weight' }, { label: 'vision' }, { label: 'hearing' }
      ]);
    this.additionalInfo = this.events.reduce((additionalInfo, event) => ({
      ...additionalInfo,
      [event.date]: {
        selfExamination: event.selfExamination,
        hasConditions: event.conditions && Object.values(event.conditions).some(value => value === true),
        hasInfo: event.hasInfo === true || Object.entries(event).find(
          ([ key, value ]: [ string, string ]) => (conditionAndTreatmentFields.indexOf(key) > -1) &&
          value !== ''
        ) !== undefined
      }
    }), {});
    this.displayedColumns = Object.keys(this.eventTable.data[0]);
    this.isWaitingForEvents = false;
  }

  deleteClick(event) {
    this.openDeleteDialog(this.deleteEvent(event), 'single', event.date, 1);
  }

  deleteSelected() {
    const events = this.selection.selected.map(date => this.events.find(e => e.date === date));
    let amount = 'many',
      okClick = this.deleteEvents(events),
      displayName = '';
    if (events.length === 1) {
      const event: any = events[0];
      amount = 'single';
      okClick = this.deleteEvent(event);
      displayName = event.date;
    }
    this.openDeleteDialog(okClick, amount, displayName, events.length);
  }

  openDeleteDialog(okClick, amount, displayName = '', count) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'examination',
        displayName,
        count
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteEvent(event) {
    return {
      request: this.healthService.deleteEvent(event._id),
      onNext: (data) => {
        this.events = this.events.filter((e: any) => data.id !== e._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage(`You have deleted examination: ${event.date}`);
      },
      onError: (error) => this.planetMessageService.showAlert(`There was a problem deleting this examination.`)
    };
  }

  deleteEvents(events) {
    const deleteArray = events.map(event => ({ _id: event._id, _rev: event._rev, _deleted: true }));
    return {
      request: this.healthService.bulkDeleteEvents(deleteArray),
      onNext: (data) => {
        this.events = this.events.filter((event: any) => !deleteArray.find(e => e._id === event._id));
        this.deleteDialog.close();
        this.planetMessageService.showMessage(`You have deleted ${deleteArray.length} examinations`);
      },
      onError: (error) => this.planetMessageService.showAlert(`There was a problem deleting these examinations.`)
    };
  }

}
