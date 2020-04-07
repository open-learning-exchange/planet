import { Component, Input, Inject } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

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
    <button class="mat-raised-button primary-color " (click)="routeToCourses(data?.courseDetail._id)">View Course</button>
    <button class="mat-raised-button mat-warn font-size-1 margin-lr-8" (click)="close()">Close</button>
  `
})
export class CoursesViewDetailDialogComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialogRef: MatDialogRef<CoursesViewDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

    close() {
      this.dialogRef.close();
    }

    routeToCourses(courseId) {
      this.dialogRef.close();
      this.router.navigate([ '../../courses/view/', courseId ], { relativeTo: this.route });
    }

}
