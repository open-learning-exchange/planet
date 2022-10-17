import { Component, Inject, OnInit } from "@angular/core"
import { Time } from "@angular/common";
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from "../../../../../environments/environment";

@Component({
  templateUrl: "./landing-eventdetail.component.html",
  styles: [`
    .event-decription-box {
      & blockquote {
        margin: 0;
        padding: 0 15px;
        border-left: solid 4px #951fcc;
      }
    }
    
    .gutter-bottom {
      margin-bottom: 0.35em;
    }

    .content-text {
      margin: 0px;
      font-family: Roboto, Helvetica, Arial, sans-serif;
      font-weight: 400;
      font-size: 1rem;
      line-height: 1.5;
      color: rgba(0, 0, 0, 0.6);
    }

    .subtitle1 {
      line-height: 1.75;
    }

    .subtitle2 {
      margin: 0px 0px 0.35em;
      font-weight: 500;
      font-size: 0.875rem;
      line-height: 1.57;
    }

    .event-button {
      color: white;
      background-color: #951FCC;
      border-color: #951FCC;
    }

    .cancel-button {
      color: #951FCC;
    }
    `
  ]
})
export class LandingEventDetailComponent implements OnInit {

  baseUrl = environment.uplanetAddress;
  event: any;
  renderedStartDate: any;
  renderedEndDate: any;

  title: string;
  startDate: Date;
  endDate: Date;
  startTime: Time;
  endTime: Time;
  description: string;
  location: string;

  constructor(
    private dialogRef: MatDialogRef<LandingEventDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.event = this.data.event || {};
  }

  // HandleClose
  ngOnInit() {
    const { title, startDate, endDate, startTime, endTime, description, meetupLocation } = this.event.doc;
    this.title = title;
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.startTime = startTime;
    this.endTime = endTime;
    this.description = description;
    this.location = meetupLocation;

    this.renderedStartDate = this.startDate && !Number.isNaN(this.startDate)
      && this.startDate.getFullYear() !== 1969
      ? `${this.startDate.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${this.startTime ?? ''}`
      : 'No hay fecha de inicio';

    this.renderedEndDate = this.endDate && !Number.isNaN(this.endDate)
      && this.endDate.getFullYear() !== 1969
      ? `${this.endDate.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${this.endTime ?? ''}`
      : 'No hay fecha de fin';
  }

  clickCloseCard() {
    this.dialogRef.close();
  }

  handleURL() {
    // should be changed in the future but we need more info abhout how meeting links are stored
    window.open(`${this.baseUrl}/spa/meetups`, '_newtab');
  };

}