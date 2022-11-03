import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LandingEventsService } from './landing-events.service';
import { LandingEventDetailComponent } from './landing-eventdetail/landing-eventdetail.component';
import { isEmpty } from 'ramda';

@Component({
  selector: 'planet-landing-event',
  templateUrl: './landing-event.component.html',
  styles: [ `
    .gutter-bottom {
      margin-bottom: 0.35em;
    }

    .event-title {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .event-container {
      margin-top: 16px;
      margin-bottom: 16px;
    }

    .event-card-container {
      margin-right: 8px;
    }

    .event-card-text {
      margin-top: 8px;
      margin-bottom: 8px;
    }
  ` ]
})
export class LandingEventComponent implements OnInit {

  isEmpty = isEmpty;
  events: any;
  selectedEvent: any;

  constructor(
    private landingEventsService: LandingEventsService,
    private dialog: MatDialog
  ) { }

  // Should be useEventsToday() function
  ngOnInit(): void {
    this.landingEventsService.getEvents().subscribe((data) => {
      this.events = data.rows;
    });
  }

  findEvent(id: string) {
    for (const event of this.events) {
      if (event.id === id) {
        return event;
      }
    }
  }

  seeDetails(id: string) {
    this.selectedEvent = id;
    this.dialog.open(LandingEventDetailComponent, {
      data: { event: this.findEvent(id) },
      width: '50vw',
      maxHeight: '90vh'
    });
  }

}
