import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
import { Subject } from 'rxjs/Subject';
import { environment } from '../../../environments/environment';
import { SubmissionsService } from '../../submissions/submissions.service';

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

  onDestroy$ = new Subject<void>();
  courseDetail: any = {};
  parent = this.route.snapshot.data.parent;
  showExamButton = false;

  constructor(
    private router: Router,
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((course: any) => {
      this.courseDetail = course;
      this.showExamButton = this.checkMyCourses(course._id);
    });
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
    this.submissionsService.openSubmission({
      parentId: stepDetail.exam._id + '@' + this.courseDetail._id,
      parent: stepDetail.exam,
      user: this.userService.get().name,
      type: 'exam' });
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      this.router.navigate([ './step/' + (stepNum + 1) + '/exam',
        { questionNum: submission.answers.length + 1 } ], { relativeTo: this.route });
    });
  }

  resourceUrl(stepDetail) {
    if (Object.keys(stepDetail.attachment.doc._attachments)[0]) {
      const filename = stepDetail.openWhichFile || Object.keys(stepDetail.attachment.doc._attachments)[0];
      return environment.couchAddress + 'resources/' + stepDetail.attachment.doc._id + '/' + filename;
    }
  }

  checkMyCourses(courseId: string) {
    return this.userService.shelf.courseIds.includes(courseId);
  }

}
