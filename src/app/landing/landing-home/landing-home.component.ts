import { Component, HostListener, ViewEncapsulation, OnInit, OnChanges } from '@angular/core';
import { DeviceInfoService } from '../../shared/device-info.service';
import { LandingEventsService } from './landing-event/landing-events.service';

@Component({
  selector: 'planet-landing-home',
  templateUrl: './landing-home.component.html',
  styleUrls: [ './landing-home.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent implements OnInit {

  isMobile: boolean = this.deviceInfoService.getDeviceSize().isMobile;
  events: any = [];
  header = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  };
  buttonText = {
    today: 'Hoy',
    month: 'Mes',
    day: 'Día',
    week: 'Semana'
  };
  resizeCalendar: any = false;

  constructor(
    private deviceInfoService: DeviceInfoService,
    private landingEventsService: LandingEventsService
  ) { }

  ngOnInit(): void {
    this.landingEventsService.getEvents().subscribe((data) => {
      data.rows.map((event) => {
        this.events.push({
          title: event.doc.title,
          start: new Date(event.doc.startDate),
          end: new Date(event.doc.endDate),
          // allDay: true,
          // editable: true,
          textColor: 'white',
          backgroundColor: '#951FCC',
          borderColor: '#951FCC',
          extendedProps: {
            meetup: event.doc
          }
        });
      });
    });
  }

  @HostListener('window:resize') OnResize() {
    this.isMobile = this.deviceInfoService.getDeviceSize().isMobile;
  }

  tabChanged({ index }) {
    if (index === 1) {
      this.resizeCalendar = true;
    } else {
      this.resizeCalendar = false;
    }
  }
}
