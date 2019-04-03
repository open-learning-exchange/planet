import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { ResourcesService } from '../../resources/resources.service';

@Component({
  templateUrl: './courses-step-view.component.html',
  styleUrls: [ './courses-step-view.scss' ]
})

export class CoursesStepViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  stepNum = 0;
  stepDetail: any = { stepTitle: '', description: '', resources: [] };
  courseId: string;
  maxStep = 1;
  resourceUrl = '';
  examStart = 1;
  isExamInProgress = false;
  attempts = 0;
  showExamButton = false;
  resource: any;
  progress: any;
  examPassed = false;
  parent = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private userService: UserService,
    private submissionsService: SubmissionsService,
    private resourcesService: ResourcesService
  ) {}

  ngOnInit() {
    combineLatest(
      this.coursesService.courseUpdated$,
      this.resourcesService.resourcesListener(this.parent)
    ).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ { course, progress = [] }, resources ]: [ { course: any, progress: any }, any[] ]) => {
      this.initCourse(course, progress, resources);
    });
    this.getSubmission();
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.parent = this.route.snapshot.data.parent;
      this.stepNum = +params.get('stepNum'); // Leading + forces string to number
      this.courseId = params.get('id');
      this.coursesService.requestCourse({ courseId: this.courseId, parent: this.parent });
    });
    this.resourcesService.requestResourcesUpdate(this.parent);
  }

  getSubmission() {
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe(({ submission, attempts, bestAttempt = { grade: 0 } }) => {
      this.examStart = this.submissionsService.nextQuestion(submission, submission.answers.length - 1, 'passed') + 1;
      this.isExamInProgress = submission.answers.length === 0;
      this.attempts = attempts;
      const examPercent = (bestAttempt.grade / this.stepDetail.exam.totalMarks) * 100;
      this.examPassed = examPercent >= this.stepDetail.exam.passingPercentage;
      if (!this.parent && this.progress.passed !== this.examPassed) {
        this.coursesService.updateProgress({
          courseId: this.courseId, stepNum: this.stepNum, passed: this.examPassed
        });
      }
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initCourse(course, progress, resources) {
    // To be readable by non-technical people stepNum param will start at 1
    this.stepDetail = course.steps[this.stepNum - 1];
    this.progress = progress.find((p: any) => p.stepNum === this.stepNum) || { passed: false };
    if (!this.parent && this.progress.stepNum === undefined) {
      this.coursesService.updateProgress({ courseId: course._id, stepNum: this.stepNum, passed: this.stepDetail.exam === undefined });
    }
    this.maxStep = course.steps.length;
    this.attempts = 0;
    if (this.stepDetail.exam) {
      this.showExamButton = !this.parent && this.checkMyCourses(course._id);
      this.submissionsService.openSubmission({
        parentId: this.stepDetail.exam._id + '@' + course._id,
        parent: this.stepDetail.exam,
        user: this.userService.get(),
        type: 'exam' });
    }
    this.stepDetail.resources.sort(this.coursesService.stepResourceSort);
    this.stepDetail.resources = this.filterResources(this.stepDetail, resources);
    this.resource = this.stepDetail.resources ? this.stepDetail.resources[0] : undefined;
  }

  // direction = -1 for previous, 1 for next
  changeStep(direction) {
    this.router.navigate([ '../' + (this.stepNum + direction) ], { relativeTo: this.route });
  }

  backToCourseDetail() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

  setResourceUrl(resourceUrl: string) {
    this.resourceUrl = resourceUrl;
  }

  checkMyCourses(courseId: string) {
    return this.userService.shelf.courseIds.includes(courseId);
  }

  onResourceChange(value) {
    this.resource = value;
  }

  goToExam() {
    this.router.navigate([ 'exam', { questionNum: this.examStart } ], { relativeTo: this.route });
  }

  filterResources(step, resources) {
    const resourceIds = resources.map((res: any) => res._id);
    return step.resources ?
      step.resources.filter(resource => resourceIds.indexOf(resource._id) !== -1) :
      [];
  }

}
