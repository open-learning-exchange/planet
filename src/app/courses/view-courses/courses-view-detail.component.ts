import { Component, Input, Inject, OnInit, OnChanges } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import * as constants from '../constants';
import { CoursesService } from '../courses.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { languages } from '../../shared/languages';

@Component({
  selector: 'planet-courses-detail',
  templateUrl: './courses-view-detail.component.html'
})
export class CoursesViewDetailComponent implements OnChanges {

  @Input() courseDetail: any = {};
  @Input() parent = false;
  planetConfiguration = this.stateService.configuration;
  imageSource: 'parent' | 'local' = 'local';
  gradeOptions: any = constants.gradeLevels;
  subjectOptions: any = constants.subjectLevels;
  languageOptions: any = languages;

  constructor(
    private stateService: StateService
  ) {}

  ngOnChanges() {
    this.imageSource = this.parent === true ? 'parent' : 'local';
  }
}

@Component({
  template: `
    <ng-container *ngIf="courseDetail">
      <h3 mat-dialog-title>{{courseDetail.courseTitle}}</h3>
      <mat-dialog-content>
        <planet-courses-detail [courseDetail]="courseDetail"></planet-courses-detail>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-dialog-close mat-raised-button i18n>Close</button>
        <button mat-dialog-close mat-raised-button color="primary" (click)="routeToCourses(courseDetail._id)" i18n>View Course</button>
      </mat-dialog-actions>
    </ng-container>
  `
})
export class CoursesViewDetailDialogComponent implements OnInit {

  courseDetail;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private coursesService: CoursesService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnInit() {
    this.dialogsLoadingService.start();
    this.coursesService.requestCourse({ courseId: this.data.courseId, forceLatest: true });
    this.coursesService.courseUpdated$.pipe(take(1)).subscribe(({ course }) => {
      this.courseDetail = course;
      this.dialogsLoadingService.stop();
    });
  }

  routeToCourses(courseId) {
    const navigationExtras = this.data.returnState ? { state: { returnState: this.data.returnState } } : { relativeTo: this.route };
    this.router.navigate([ '../../courses/view/', courseId ], navigationExtras);
  }
}
