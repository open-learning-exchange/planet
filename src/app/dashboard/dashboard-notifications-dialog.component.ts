import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { myDashboardRoute } from '../home/router-constants';
import { MaterialModule } from '../shared/material.module';

@Component({
  templateUrl: './dashboard-notifications-dialog.component.html',
  styleUrls: ['./dashboard-notifications-dialog.component.scss'],
  imports: [ CommonModule, RouterModule, MaterialModule ]
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
