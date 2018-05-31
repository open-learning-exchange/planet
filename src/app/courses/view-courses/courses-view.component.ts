import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
import { Subject } from 'rxjs/Subject';
import { environment } from '../../../environments/environment';
import { Course } from '../../shared/services';

@Component({
  templateUrl: './courses-view.component.html',
  styles: [ `
  .view-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "detail view";
  }

  .course-detail {
    grid-area: detail;
    padding: 1rem;
  }

  .course-view {
    grid-area: view;
  }

  .course-detail, .course-view {
    overflow: auto;
  }
  ` ]
})

export class CoursesViewComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  private courseDetail: Course;

  constructor(
    private router: Router,
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(course => this.courseDetail = course);
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true }),
      error => console.log(error)
    );
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  viewStep() {
    this.router.navigate([ './step/1' ], { relativeTo: this.route });
  }

  goToExam(stepDetail, stepNum) {
    this.coursesService.openSubmission({
      parentId: stepDetail.exam._id + '@' + this.courseDetail._id,
      parent: stepDetail.exam,
      user: this.userService.get().name,
      type: 'exam' });
    this.coursesService.submissionUpdated$.subscribe(({ submission }) => {
      this.router.navigate([ './step/' + (stepNum + 1) + '/exam',
        (submission.answers.length + 1) ], { relativeTo: this.route });
    });
  }

  resourceUrl(stepDetail) {
    if (Object.keys(stepDetail.attachment.doc._attachments)[0]) {
      const filename = stepDetail.openWhichFile || Object.keys(stepDetail.attachment.doc._attachments)[0];
      return environment.couchAddress + 'resources/' + stepDetail.attachment.doc._id + '/' + filename;
    }
  }
}
