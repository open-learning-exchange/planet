import { Component, Inject, OnInit } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { myDashboardRoute } from '../home/router-constants';

@Component({
  templateUrl: './dashboard-notifications-dialog.component.html',
  styleUrls: ['./dashboard-notifications-dialog.component.scss']
})
export class DashboardNotificationsDialogComponent implements OnInit {

  surveys: any[] = [];
  surveysCount: number;
  myDashboardRoute = myDashboardRoute;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit() {
    this.surveys = this.data.surveys.map(survey => ({
      ...survey,
      completedAnswers: survey.answers.filter(answer => answer.value).length,
      nextQuestion: (survey.answers.findIndex(answer => !answer.value) + 1) || survey.answers.length + 1
    }));
    this.surveysCount = this.surveys.length;
  }

}
