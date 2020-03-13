import { Component, Input, Inject } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'planet-courses-detail',
  templateUrl: './courses-view-detail.component.html'
})
export class CoursesViewDetailComponent {

  @Input() courseDetail: any = {};
  planetConfiguration = this.stateService.configuration;

  constructor(
    private stateService: StateService
  ) {}

}

@Component({
  template: `
    <h3>{{data.courseDetail.courseTitle}}</h3>
    <planet-courses-detail [courseDetail]="data.courseDetail"></planet-courses-detail>
  `
})
export class CoursesViewDetailDialogComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

}
