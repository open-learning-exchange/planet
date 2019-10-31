import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource, MatDialog } from '@angular/material';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { HealthEventDialogComponent } from './health-event-dialog.component';
import { environment } from '../../environments/environment';

@Component({
  templateUrl: './health.component.html',
  styleUrls: [ './health.scss' ]
})
export class HealthComponent implements OnInit, AfterViewChecked {

  @ViewChild('examsTable', { static: false }) examsTable: ElementRef;
  userDetail = this.userService.get();
  healthDetail: any = {};
  events: any[] = [];
  eventTable = new MatTableDataSource();
  displayedColumns: string[] = [];
  imageSrc = '';
  urlPrefix = environment.couchAddress + '/_users/';
  initializeEvents = true;

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.healthService.getHealthData(this.userService.get()._id).subscribe(({ profile, events }) => {
      // const { profile, events } = doc;
      this.userDetail = { ...profile, ...this.userDetail };
      if (this.userDetail._attachments) {
        this.imageSrc = `${this.urlPrefix}/${this.userDetail._id}/${Object.keys(this.userDetail._attachments)[0]}`;
      }
      this.healthDetail = profile;
      this.events = events || [];
      this.setEventData();
    });
  }

  ngAfterViewChecked() {
    if (this.initializeEvents === false || this.examsTable === undefined) {
      return;
    }
    this.initializeEvents = false;
    this.examsTable.nativeElement.scrollLeft = this.examsTable.nativeElement.scrollWidth - this.examsTable.nativeElement.clientWidth;
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  examClick(eventDate) {
    if (eventDate !== 'label') {
      this.dialog.open(HealthEventDialogComponent, {
        data: { event: this.events.find(event => event.date === +eventDate) },
        width: '50vw',
        maxHeight: '90vh'
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
    this.displayedColumns = Object.keys(this.eventTable.data[0]);
  }

}
