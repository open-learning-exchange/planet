import { Component, Inject, OnInit } from '@angular/core';
import { Time } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../../environments/environment';

@Component({
  templateUrl: './landing-eventdetail.component.html',
  styleUrls: [ './landing-eventdetail.scss' ]
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

    this.renderedStartDate = this.renderedDate(this.startDate, 'de inicio');
    this.renderedEndDate = this.renderedDate(this.endDate, 'de fin');
  }

  renderedDate(date: Date, statement: String) {
    return date && !Number.isNaN(date) && date.getFullYear() !== 1969
      ? `${date.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${this.endTime ?? ''}`
      : `No hay fecha ${statement}`;
  }

  clickCloseCard() {
    this.dialogRef.close();
  }

  handleURL() {
    // should be changed in the future but we need more info abhout how meeting links are stored
    window.open(`${this.baseUrl}/spa/meetups`, '_newtab');
  }

}
