import { Component, Input, Inject } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { Router, ActivatedRoute } from '@angular/router';
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
    <mat-dialog-actions>
      <button mat-dialog-close mat-raised-button color="warn" i18n>Close</button>
      <button mat-dialog-close mat-raised-button color="primary" (click)="routeToCourses(data?.courseDetail._id)" i18n>View Course</button>
    </mat-dialog-actions>
  `
})
export class CoursesViewDetailDialogComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

    routeToCourses(courseId) {
      this.router.navigate([ '../../courses/view/', courseId ], { relativeTo: this.route });
    }

}
