import { Component, Input } from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid';

@Component({
  selector: 'planet-calendar',
  template: `
    <full-calendar
      defaultView="dayGridWeek"
      [plugins]="calendarPlugins"
      [firstDay]="6"
      [header]="header"
      [customButtons]="buttons">
    </full-calendar>
  `
})
export class PlanetCalendarComponent {

  @Input() link: any = {};
  calendarPlugins = [ dayGridPlugin ];
  header = {
    left: 'title',
    center: '',
    right: 'addEventButton dayGridMonth,dayGridWeek,dayGridDay today prev,next'
  };
  buttons = {
    addEventButton: {
      text: 'Add Event',
      click: this.openAddEventDialog()
    }
  };
  dbName = 'meetups';

  openAddEventDialog(){

  }

}
