import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './dashboard-notifications-dialog.component.html'
})
export class DashboardNotificationsDialogComponent implements OnInit {

  surveys: any[] = [];
  surveysCount: number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit() {
    this.surveys = this.data.surveys;
    this.surveysCount = this.surveys.length;
  }

}
