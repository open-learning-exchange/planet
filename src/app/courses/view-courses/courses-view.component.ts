import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubmissionsService } from '../../submissions/submissions.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './courses-view.component.html',
  styleUrls: [ 'courses-view.scss' ]
})

export class CoursesViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  courseDetail: any = { steps: [] };
  parent = this.route.snapshot.data.parent;
  isUserEnrolled = false;
  progress = [ { stepNum: 1 } ];
  fullView = 'on';

  constructor(
    private router: Router,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$
    .pipe(takeUntil(this.onDestroy$))
    .subscribe(({ course, progress = [ { stepNum: 0 } ] }: { course: any, progress: any }) => {
      this.courseDetail = course;
      this.courseDetail.steps = this.courseDetail.steps.map(step => {
        step.resources = step.resources.filter(res => res._attachments);
        step.resources.sort(function (a: { title: string }, b: { title: string }) {
          return a.title.localeCompare(b.title);
        });
        return step;
      });
      this.progress = progress;
      this.isUserEnrolled = this.checkMyCourses(course._id);
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => this.coursesService.requestCourse(
        { courseId: params.get('id'), forceLatest: true, parent: this.parent }
      ), error => console.log(error)
    );
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  viewStep() {
    const latestStep = this.progress.reduce((stepNum, prog) => {
      return prog.stepNum > stepNum ? prog.stepNum : stepNum;
    }, 1);
    this.router.navigate([ './step/' + latestStep ], { relativeTo: this.route });
  }

  goToExam(stepDetail, stepNum) {
    this.submissionsService.openSubmission({
      parentId: stepDetail.exam._id + '@' + this.courseDetail._id,
      parent: stepDetail.exam,
      user: this.userService.get(),
      type: 'exam' });
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      const questionNum = this.submissionsService.nextQuestion(submission, submission.answers.length - 1, 'passed') + 1;
      this.router.navigate([ './step/' + (stepNum + 1) + '/exam',
        { questionNum } ], { relativeTo: this.route });
    });
  }

  resourceUrl(resource) {
    if (resource._attachments && Object.keys(resource._attachments)[0]) {
      const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
      return environment.couchAddress + '/resources/' + resource._id + '/' + filename;
    }
  }

  checkMyCourses(courseId: string) {
    return this.userService.shelf.courseIds.includes(courseId);
  }

  updateRating(itemId) {
    this.coursesService.requestCourse({ courseId: itemId, forceLatest: true });
  }

  courseToggle(courseId, type) {
    this.coursesService.courseResignAdmission(courseId, type).subscribe((res) => {
      this.isUserEnrolled = !this.isUserEnrolled;
    }, (error) => ((error)));
  }

  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

}
