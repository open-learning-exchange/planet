import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { StateService } from '../shared/state.service';
import { HealthEventDialogComponent } from './health-event-dialog.component';
import { environment } from '../../environments/environment';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { conditionAndTreatmentFields } from './health.constants';
import { findDocuments } from '../shared/mangoQueries';

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
  isLoading = true;
  onDestroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private couchService: CouchService,
    private stateService: StateService
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
    this.healthService.examinationsUpdated.subscribe(() => {
      this.refreshExaminations();
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
    this.isLoading = true;
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
      this.isLoading = false;
    }, () => {
      this.isLoading = false;
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

  refreshExaminations() {
    this.healthService.getExaminations(this.stateService.configuration.code).subscribe(events => {
      this.events = events;
      this.setEventData();
    });
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

}
