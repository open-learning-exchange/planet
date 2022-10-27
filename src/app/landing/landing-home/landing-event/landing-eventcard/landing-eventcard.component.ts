import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Time } from '@angular/common';

@Component({
  selector: 'planet-landing-eventcard',
  templateUrl: './landing-eventcard.component.html',
  styles: [ `
    .root-style {
      display: flex;
      background-color: #f4f4f4;
      margin-top: 8px;
      min-width: 100%;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      border-left: solid 12px #37833b;
    }

    .event-card-container {
      width: 100%;
      margin-left: 12px;
      padding: 8px;
    }
    `
  ]
})
export class LandingEventCardComponent implements OnInit {

  @Input() event: any;
  @Output() cardDetailsEvent = new EventEmitter<any>();

  title: string;
  startDate: string;
  endDate: string;

  ngOnInit() {
    const { title, startDate, endDate } = this.event.doc;
    this.title = title;
    this.startDate = new Date(startDate).toLocaleDateString('es-PE');
    this.endDate = new Date(endDate).toLocaleDateString('es-PE');
  }

  clickCardDetails() {
    this.cardDetailsEvent.emit(this.event.doc._id);
  }

}
