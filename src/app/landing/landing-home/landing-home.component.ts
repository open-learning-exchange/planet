import { Component, HostListener, ViewEncapsulation, Output, EventEmitter, OnInit } from '@angular/core';
import { CheckMobileService } from '../../shared/checkMobile.service';
import { LandingEventsService } from './landing-event/landing-events.service';

@Component({
  selector: 'planet-landing-home',
  templateUrl: './landing-home.component.html',
  styleUrls: ['./landing-home.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent implements OnInit {
  @Output() calendarTabbedEvent = new EventEmitter<any>();
  isMobile: boolean = this.checkMobileService.checkIsMobile();
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
  resizeCalendar: any;

  constructor(
    private checkMobileService: CheckMobileService,
    private landingEventsService: LandingEventsService
  ) { }

  ngOnInit(): void {
    this.landingEventsService.getEvents().subscribe((data) => {      
      this.events.push(data.rows);
    });
  }

  @HostListener('window:resize') OnResize() {
    this.isMobile = this.checkMobileService.checkIsMobile();
  }

  tabChanged({ index }) {
    if (index == 1) {
      // this.calendarTabbedEvent.emit();
      this.resizeCalendar = true;
    }
  }
}
