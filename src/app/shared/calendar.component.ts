import { Component, Input, OnInit } from '@angular/core';
import { OptionsInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MatDialog } from '@angular/material/dialog';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { days, millisecondsToDay } from '../meetups/constants';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';
import { addDateAndTime, styleVariables } from './utils';

@Component({
  selector: 'planet-calendar',
  template: `
    <full-calendar
      defaultView="dayGridMonth"
      [events]="events"
      [eventTimeFormat]="eventTimeFormat"
      [plugins]="calendarPlugins"
      [firstDay]="6"
      [header]="header"
      [buttonText]="buttonText"
      [customButtons]="buttons"
      (eventClick)="eventClick($event)">
    </full-calendar>
  `
})
export class PlanetCalendarComponent implements OnInit {

  @Input() link: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  options: OptionsInput;
  calendarPlugins = [ dayGridPlugin ];
  header = {
    left: 'title',
    center: '',
    right: 'addEventButton today prev,next'
  };
  buttonText = {
    today: 'Today'
  };
  buttons = {};
  eventTimeFormat = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  dbName = 'meetups';
  events: any[] = [];
  meetups: any[] = [];
  tasks: any[] = [];

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.getMeetups();
    this.getTasks();
    this.buttons = this.editable ?
      {
        addEventButton: {
          text: 'Add Event',
          click: this.openAddEventDialog.bind(this)
        }
      } :
      {};
  }

  getMeetups() {
    this.couchService.findAll(this.dbName, findDocuments({ link: this.link })).subscribe((meetups: any[]) => {
      this.meetups = meetups.map(meetup => {
        switch (meetup.recurring) {
          case 'daily':
            return this.dailyEvents(meetup);
          case 'weekly':
            return this.weeklyEvents(meetup);
          case 'none':
          default:
            return this.eventObject(meetup);
        }
      }).flat();
      this.events = [ ...this.meetups, ...this.tasks ];
    });
  }

  getTasks() {
    this.couchService.findAll('tasks', findDocuments({ link: this.link })).subscribe((tasks: any[]) => {
      this.tasks = tasks.filter(task => task.status !== 'archived').map(task => {
        const taskColors = task.completed ? {
          backgroundColor: styleVariables('grey'), borderColor: styleVariables('grey'), textColor: styleVariables('greyText')
        } : {
          backgroundColor: styleVariables('accent'), borderColor: styleVariables('accent'), textColor: styleVariables('accentText')
        };
        return this.eventObject({ ...task, isTask: true }, task.deadline, task.deadline, taskColors);
      });
      this.events = [ ...this.meetups, ...this.tasks ];
    });
  }

  eventObject(
    meetup,
    startDate = meetup.startDate,
    endDate = meetup.endDate || startDate,
    otherProps: any = {
      backgroundColor: styleVariables('primary'), borderColor: styleVariables('primary'), textColor: styleVariables('primaryText')
    }
  ) {
    const allDay = !meetup.isTask && meetup.startTime === undefined || meetup.startTime === '';
    return {
      title: meetup.title,
      start: addDateAndTime(startDate, meetup.startTime),
      end: addDateAndTime(endDate, allDay && endDate > startDate ? '24:00' : meetup.endTime),
      allDay,
      editable: true,
      extendedProps: { meetup },
      ...otherProps
    };
  }

  dailyEvents(meetup) {
    return [ ...Array(meetup.recurringNumber).keys() ].map(dayOffset => {
      const millisecondOffset = millisecondsToDay * dayOffset;
      return this.eventObject(meetup, meetup.startDate + millisecondOffset, meetup.endDate + millisecondOffset);
    });
  }

  weeklyEvents(meetup) {
    if (meetup.day.length === 0 || meetup.recurringNumber === undefined) {
      return this.eventObject(meetup);
    }
    const events = [];
    let i = 0;
    while (events.length < meetup.recurringNumber) {
      const startDay = meetup.startDate + (i * millisecondsToDay);
      const date = new Date(startDay);
      if (meetup.day.indexOf(days[date.getDay()]) !== -1) {
        events.push(this.eventObject(meetup, startDay, meetup.endDate + (i * millisecondsToDay)));
      }
      i++;
    }
    return events;
  }

  openAddEventDialog() {
    this.dialog.open(DialogsAddMeetupsComponent, {
      data: { link: this.link, sync: this.sync, onMeetupsChange: this.onMeetupsChange.bind(this), editable: this.editable }
    });
  }

  onMeetupsChange() {
    this.getMeetups();
  }

  eventClick({ event }) {
    this.dialog.open(DialogsAddMeetupsComponent, {
      data: {
        meetup: event.extendedProps.meetup,
        view: 'view',
        link: this.link,
        sync: this.sync,
        editable: this.editable,
        onMeetupsChange: this.onMeetupsChange.bind(this)
      }
    });
  }

}
