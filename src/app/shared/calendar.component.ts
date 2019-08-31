import { Component, Input } from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { MatDialog } from '@angular/material';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';

@Component({
  selector: 'planet-calendar',
  template: `
    <full-calendar
      defaultView="timeGridWeek"
      [events]="events"
      [plugins]="calendarPlugins"
      [firstDay]="6"
      [header]="header"
      [customButtons]="buttons"
      (eventClick)="eventClick($event)">
    </full-calendar>
  `
})
export class PlanetCalendarComponent {

  @Input() link: any = {};
  calendarPlugins = [ dayGridPlugin, timeGridPlugin ];
  header = {
    left: 'title',
    center: '',
    right: 'addEventButton dayGridMonth,timeGridWeek,timeGridDay today prev,next'
  };
  buttons = {
    addEventButton: {
      text: 'Add Event',
      click: this.openAddEventDialog.bind(this)
    }
  };
  dbName = 'meetups';
  events: any[] = [];

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.getMeetups();
  }

  getMeetups() {
    this.couchService.findAll(this.dbName, findDocuments({ link: this.link })).subscribe((meetups: any[]) => {
      this.events = meetups.map(meetup => ({
        title: meetup.title,
        start: new Date(meetup.startDate + (Date.parse('1970-01-01T' + meetup.startTime + 'Z') || 0)),
        end: new Date(meetup.endDate + (Date.parse('1970-01-01T' + meetup.endTime + 'Z') || 0)),
        allDay: meetup.startTime === undefined || meetup.startTime === '',
        editable: true,
        extendedProps: { meetup }
      }));
    });
  }

  openAddEventDialog() {
    this.dialog.open(DialogsAddMeetupsComponent, { data: { link: this.link, onMeetupSubmitted: this.onMeetupSubmitted.bind(this) } });
  }

  onMeetupSubmitted(res) {
    this.getMeetups();
  }

  eventClick(event) {
    console.log(event);
  }

}
