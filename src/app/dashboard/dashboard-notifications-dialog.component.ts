import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { myDashboardRoute } from '../home/router-constants';

@Component({
  templateUrl: './dashboard-notifications-dialog.component.html'
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
