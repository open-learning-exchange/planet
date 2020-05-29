import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog, MatMenuTrigger } from '@angular/material';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { ResourcesService } from '../../resources/resources.service';
import { DialogsSubmissionsComponent } from '../../shared/dialogs/dialogs-submissions.component';
import { StateService } from '../../shared/state.service';

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
  examText: 'continue' | 'retake' | 'take' = 'take';
  attempts = 0;
  isUserEnrolled = false;
  resource: any;
  progress: any;
  examPassed = false;
  parent = false;
  canManage = false;
  countActivity = true;
  @ViewChild(MatMenuTrigger, { static: false }) previewButton: MatMenuTrigger;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private coursesService: CoursesService,
    private userService: UserService,
    private submissionsService: SubmissionsService,
    private resourcesService: ResourcesService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    combineLatest(
      this.coursesService.courseUpdated$,
      this.resourcesService.resourcesListener(this.parent),
      this.stateService.getCouchState('exams', 'local')
    ).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ { course, progress = [] }, resources, exams ]: [ { course: any, progress: any }, any[], any[] ]) => {
      this.initCourse(course, progress, resources.map((resource: any) => resource.doc), exams);
      if (this.countActivity) {
        this.coursesService.courseActivity('visit', course, this.stepNum);
        this.countActivity = false;
      }
      this.canManage = this.userService.get().isUserAdmin ||
        course.creator !== undefined &&
        (`${this.userService.get().name}@${this.userService.get().planetCode}` === course.creator);
    });
    this.getSubmission();
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.parent = this.route.snapshot.data.parent;
      this.stepNum = +params.get('stepNum'); // Leading + forces string to number
      this.courseId = params.get('id');
      this.attempts = 0;
      this.coursesService.requestCourse({ courseId: this.courseId, parent: this.parent });
    });
    this.resourcesService.requestResourcesUpdate(this.parent);
  }

  getSubmission() {
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe(({ submission, attempts, bestAttempt = { grade: 0 } }) => {
      this.examStart = (this.submissionsService.nextQuestion(submission, submission.answers.length - 1, 'passed') + 1) || 1;
      this.examText = submission.answers.length > 0 ? 'continue' : attempts === 0 ? 'take' : 'retake';
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

  initCourse(course, progress, resources, exams) {
    // To be readable by non-technical people stepNum param will start at 1
    this.stepDetail = course.steps[this.stepNum - 1];
    this.initResources(resources);
    // Fix for multiple progress docs created.  If there are more than one for a step, then we need to call updateProgress to fix.
    const stepProgressDocs = progress.filter(p => p.stepNum === this.stepNum);
    this.progress = stepProgressDocs.find(p => p.passed) || stepProgressDocs[0] || { passed: false };
    this.isUserEnrolled = !this.parent && this.checkMyCourses(course._id);
    if (this.isUserEnrolled && (this.progress.stepNum === undefined || stepProgressDocs.length > 1)) {
      this.coursesService.updateProgress({
        courseId: course._id, stepNum: this.stepNum, passed: this.stepDetail.exam === undefined || this.progress.passed
      });
    }
    this.maxStep = course.steps.length;
    if (this.stepDetail.exam) {
      this.submissionsService.openSubmission({
        parentId: this.stepDetail.exam._id + '@' + course._id,
        parent: exams.find(exam => exam._id === this.stepDetail.exam._id) || this.stepDetail.exam,
        user: this.userService.get(),
        type: 'exam' });
    }
  }

  initResources(resources) {
    this.stepDetail.resources.sort(this.coursesService.stepResourceSort);
    this.stepDetail.resources = this.filterResources(this.stepDetail, resources);
    this.resource = this.resource === undefined && this.stepDetail.resources ? this.stepDetail.resources[0] : this.resource;
  }

  // direction = -1 for previous, 1 for next
  changeStep(direction) {
    this.router.navigate([ '../' + (this.stepNum + direction) ], { relativeTo: this.route });
    this.resource = undefined;
    this.countActivity = true;
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

  goToExam(type = 'exam', preview = false) {
    this.router.navigate(
      [
        'exam',
        {
          id: this.courseId,
          stepNum: this.stepNum,
          questionNum: type === 'survey' ? 1 : this.examStart,
          type,
          preview,
          examId: type === 'survey' ? this.stepDetail.survey._id : this.stepDetail.exam._id,
        }
      ],
      { relativeTo: this.route }
    );
  }

  filterResources(step, resources) {
    const resourceIds = resources.map((res: any) => res._id);
    return step.resources ?
      step.resources.filter((resource) => resourceIds.indexOf(resource._id) !== -1 && resource._attachments) :
      [];
  }

  openReviewDialog() {
    this.dialog.open(DialogsSubmissionsComponent, {
      minWidth: '500px',
      maxHeight: '90vh',
      data: { parentId: `${this.stepDetail.exam._id}@${this.courseId}` }
    });
  }

  surveyExists(): boolean {
    const exists = this.stepDetail && this.stepDetail.survey &&
    this.stepDetail.survey.questions && this.stepDetail.survey.questions.length > 0;
    return exists;
 }

 examExists(): boolean {
   const exists = this.stepDetail && this.stepDetail.exam &&
   this.stepDetail.exam.questions && this.stepDetail.exam.questions.length > 0;
   return exists;
 }

examAndSurveyExist(): boolean {
  const both = this.surveyExists() && this.examExists();
  return both;
 }

menuTriggerButtonClick(): void {

  if (!this.examAndSurveyExist()) {
    if (this.examExists()) {
      this.goToExam('exam', true);
      this.previewButton.closeMenu();
      return;
    }

    if (this.surveyExists()) {
      this.goToExam('survey', true);
      this.previewButton.closeMenu();
    }
  }
}


}
