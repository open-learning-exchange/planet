import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../../environments/environment';

@Component({
  templateUrl: './landing-eventdetail.component.html',
  styleUrls: [ './landing-eventdetail.scss' ]
})
export class LandingEventDetailComponent implements OnInit {

  baseUrl = environment.uplanetAddress;
  event: any = {};
  renderedStartDate: any;
  renderedEndDate: any;

  constructor(
    private dialogRef: MatDialogRef<LandingEventDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.event = this.data.event.doc || {};
  }

  ngOnInit() {
    this.renderedStartDate = this.renderedDate(new Date(this.event.startDate), 'de inicio');
    this.renderedEndDate = this.renderedDate(new Date(this.event.endDate), 'de fin');
  }

  renderedDate(date: Date, statement: String) {
    return date && !Number.isNaN(date) && date.getFullYear() !== 1969
      ? `${date.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${this.event.endTime ?? ''}`
      : `No hay fecha ${statement}`;
  }

  clickCloseCard() {
    this.dialogRef.close();
  }

  handleURL() {
    // should be changed in the future but we need more info about how meeting links are stored
    window.open(`${this.baseUrl}/spa/meetups`, '_newtab');
  }

}
