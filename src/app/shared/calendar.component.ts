import { Component, Input, OnInit } from '@angular/core';
import { OptionsInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MatDialog } from '@angular/material';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { days, millisecondsToDay } from '../meetups/constants';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';
import { addDateAndTime } from './utils';

@Component({
  selector: 'planet-calendar',
  template: `
    <full-calendar
      defaultView="dayGridMonth"
      [events]="events"
      [plugins]="calendarPlugins"
      [firstDay]="6"
      [header]="header"
      [customButtons]="buttons"
      (eventClick)="eventClick($event)">
    </full-calendar>
  `
})
export class PlanetCalendarComponent implements OnInit {

  @Input() link: any = {};
  options: OptionsInput;
  calendarPlugins = [ dayGridPlugin ];
  header = {
    left: 'title',
    center: '',
    right: 'addEventButton today prev,next'
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
      this.events = meetups.map(meetup => {
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
    });
  }

  eventObject(meetup, startDate?, endDate?) {
    return {
      title: meetup.title,
      start: addDateAndTime(startDate || meetup.startDate, meetup.startTime),
      end: addDateAndTime(endDate || meetup.endDate, meetup.endTime),
      allDay: meetup.startTime === undefined || meetup.startTime === '',
      editable: true,
      extendedProps: { meetup }
    };
  }

  dailyEvents(meetup) {
        // if(!meetup.startTime){
    // An event that lasts multiple days and does not have a start time should end on the final day selected, not the day before.
    // meetup.endDate maa end hunu paryo
    // so i think event should end on final day selected
    // }
    // first check whether kaha baata start vako ho ani yasma kati wota array maa data aako chha hera
    // yo array maa k chha 7 wota chha ki 6 wota chha? 6 wota chha vane yahi mistake chha natra feri arko thau maa herne ho sodhera
    console.log( [ ...Array(meetup.recurringNumber).keys()] );
    return [ ...Array(meetup.recurringNumber).keys() ]
      .map(dayOffset => this.eventObject(meetup, meetup.startDate + (millisecondsToDay * dayOffset)));
  }

  weeklyEvents(meetup) {
    console.log(meetup);
    if (meetup.day.length === 0 || meetup.recurringNumber === undefined) {
      return this.eventObject(meetup);
    }
    const makeEvents = (events: any[], day: number) => {
      if (events.length === meetup.recurringNumber) {
        return events;
      }
      // else if(meetup.day > 1 && !meetup.startTime){
      //   makeEvents(events, day);
      // }
      const date = new Date(day);
      // if(meetup.day > 1 && !meetup.startTime){
      return meetup.day.indexOf(days[date.getDay()]) !== -1 ?
        makeEvents([ ...events, this.eventObject(meetup, day) ], day + millisecondsToDay) :
        // console.log(makeEvents);
        makeEvents(events, day + millisecondsToDay);
      // if (meetup.day > 1 && !meetup.startTime){
      //   makeEvents(events, day);
      // }
    // }
    };
    // return makeEvents([ this.eventObject(meetup) ], meetup.startDate + millisecondsToDay);
    // if(!meetup.startTime){
    //   return this.eventObject(...meetup, );
    // }else{
    //   return makeEvents([ this.eventObject(meetup) ], meetup.startDate + millisecondsToDay);
    // }
  }

  openAddEventDialog() {
    this.dialog.open(DialogsAddMeetupsComponent, { data: { link: this.link, onMeetupsChange: this.onMeetupsChange.bind(this) } });
  }

  onMeetupsChange() {
    this.getMeetups();
  }

  eventClick({ event }) {
    // console.log(event);
    this.dialog.open(DialogsAddMeetupsComponent, { data: {
      meetup: event.extendedProps.meetup, view: 'view', link: this.link, onMeetupsChange: this.onMeetupsChange.bind(this)
    } });
  }

}
