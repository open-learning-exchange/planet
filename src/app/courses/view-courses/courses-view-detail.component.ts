import { Component, Input, Inject, OnInit, OnChanges } from '@angular/core';
import { StateService } from '../../shared/state.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA } from '@angular/material';
import { take } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { CouchService } from '../../shared/couchdb.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';

@Component({
  selector: 'planet-courses-detail',
  templateUrl: './courses-view-detail.component.html'
})
export class CoursesViewDetailComponent implements OnChanges {

  @Input() courseDetail: any = {};
  @Input() parent = false;
  planetConfiguration = this.stateService.configuration;
  imageSource: 'parent' | 'local' = 'local';

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
      <h3>{{courseDetail.courseTitle}}</h3>
      <planet-courses-detail [courseDetail]="courseDetail"></planet-courses-detail>
      <mat-dialog-actions>
        <button mat-dialog-close mat-raised-button i18n>Close</button>
        <button mat-dialog-close mat-raised-button color="primary" (click)="routeToCourses(courseDetail._id)" i18n>View Course</button>
      </mat-dialog-actions>
    </ng-container>
  `
})
export class CoursesViewDetailDialogComponent implements OnInit {
  private dbName = '_users';
  courseDetail;
  creator = '';
  userDetail: any = {};

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
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
      this.creator = this.courseDetail.creator.substring(0, this.courseDetail.creator.lastIndexOf("@"));
      this.creatorDetail();
      this.dialogsLoadingService.stop();
    });
  }

  routeToCourses(courseId) {
    this.router.navigate([ '../../courses/view/', courseId ], { relativeTo: this.route });
  }
  
  
creatorDetail(){
    const relationship = this.userRelationship(this.stateService.configuration.parentCode);
    const dbName = relationship === 'local' ? this.dbName : `${relationship}_users`;
    const userId = relationship === 'local' || relationship === 'parent'
      ? 'org.couchdb.user:' + this.creator : this.creator;
     this.couchService.get(dbName + '/' + userId).subscribe((response) => {
     this.userDetail =  response;  
      });
}
  
  
  userRelationship(planetCode: string) {
    return planetCode === this.stateService.configuration.parentCode ?
      'parent' :
      planetCode === null || planetCode === this.stateService.configuration.code ?
      'local' :
      'child';
  }

}
