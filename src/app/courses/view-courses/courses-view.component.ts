import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, take, filter, map, catchError } from 'rxjs/operators';
import { findDocuments } from '../../shared/mangoQueries';
import { UserService } from '../../shared/user.service';
import { CoursesService, ActiveStepInfo } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { StateService } from '../../shared/state.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { trackByIndex } from '../../shared/table-helpers';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatIconButton, MatButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet, NgClass } from '@angular/common';
import { CoursesProgressBarComponent } from '../progress-courses/courses-progress-bar.component';
import { CoursesViewDetailComponent } from './courses-view-detail.component';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
  MatExpansionPanelActionRow
} from '@angular/material/expansion';
import { CoursesIconComponent, courseIcons } from '../courses-icon.component';
import { PlanetMarkdownComponent } from '../../shared/planet-markdown.component';
import { ResourcesMenuComponent } from '../../resources/view-resources/resources-menu.component';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';

@Component({
  selector: 'planet-courses-view',
  templateUrl: './courses-view.component.html',
  styleUrls: ['./courses-view.scss'],
  imports: [
    MatToolbar,
    MatIconAnchor,
    MatIconButton,
    MatIcon,
    NgTemplateOutlet,
    MatButton,
    CoursesProgressBarComponent,
    CoursesViewDetailComponent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    CoursesIconComponent,
    NgClass,
    PlanetMarkdownComponent,
    MatExpansionPanelActionRow,
    ResourcesMenuComponent,
    MatAnchor,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    PlanetLoadingSpinnerComponent
  ]
})
export class CoursesViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  courseDetail: any = { steps: [] };
  parent = this.route.snapshot.data.parent;
  isUserEnrolled = false;
  progress = [ { stepNum: 1 } ];
  submissions: any[] = [];
  activeStepInfo: ActiveStepInfo;
  fullView = 'on';
  currentView: string;
  courseId: string;
  canManage: boolean;
  isLoading: boolean;
  currentUser = this.userService.get();
  planetConfiguration = this.stateService.configuration;
  examText: 'retake' | 'take' = 'take';
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  courseIcons = courseIcons;
  trackByFn = trackByIndex;
  @ViewChild(MatMenuTrigger) previewButton: MatMenuTrigger;

  constructor(
    private router: Router,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private stateService: StateService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.coursesService.courseUpdated$.pipe(
      switchMap(({ course, progress = [ { stepNum: 0 } ] }: { course: any, progress: any }) => {
        this.courseDetail = course;
        this.isLoading = false;
        this.coursesService.courseActivity('visit', course);
        this.courseDetail.steps = this.courseDetail.steps.map((step, index) => ({
          ...step,
          resources: step.resources.filter(res => res._attachments).sort(this.coursesService.stepResourceSort),
          progress: progress.find((p: any) => p.stepNum === (index + 1))
        }));
        this.progress = progress;
        this.isUserEnrolled = this.checkMyCourses(course._id);
        this.activeStepInfo = this.coursesService.getActiveStep(this.courseDetail, this.progress, this.submissions);
        this.canManage = (this.currentUser.isUserAdmin && !this.parent) ||
          this.courseDetail.creator !== undefined &&
          (this.currentUser.name === this.courseDetail.creator.slice(0, this.courseDetail.creator.indexOf('@')));
        return forkJoin([
          this.stateService.getCouchState('exams', 'local'),
          this.submissionsService.getSubmissions(findDocuments({
            'user.name': this.currentUser.name,
            parentId: { $regex: '@' + course._id }
          })).pipe(catchError(() => of([])))
        ]);
      }),
      takeUntil(this.onDestroy$)
    ).subscribe(([exams, submissions]) => {
      const stepExam = (step) => step.exam && exams.find(exam => exam._id === step.exam._id) || step.exam;
      this.courseDetail.steps = this.courseDetail.steps.map(step => ({ ...step, exam: stepExam(step) }));
      this.submissions = submissions || [];
      this.activeStepInfo = this.coursesService.getActiveStep(this.courseDetail, this.progress, this.submissions);
    }, () => this.isLoading = false);
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      if (submission) {
        const existingIndex = this.submissions.findIndex(s =>
          s._id === submission._id || (s.parentId === submission.parentId && s.parent?._id === submission.parent?._id)
        );
        if (existingIndex > -1) {
          this.submissions[existingIndex] = submission;
        } else {
          this.submissions.push(submission);
        }
        this.activeStepInfo = this.coursesService.getActiveStep(this.courseDetail, this.progress, this.submissions);
      }
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.courseId = params.get('id');
      this.coursesService.requestCourse({ courseId: this.courseId, forceLatest: true, parent: this.parent });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setStepButtonStatus(step, stepNum, stepClickedNum = stepNum, getPrevious = true) {
    if (stepNum > 0 && getPrevious) {
      const previousStep = this.courseDetail.steps[stepNum - 1];
      this.setStepButtonStatus(previousStep, stepNum - 1, stepClickedNum, previousStep.exam === undefined);
    }
    if (step.exam && step.submission === undefined) {
      this.getStepSubmission(step).subscribe((submissionStatus: { examText, submission, attempts }) => {
        this.courseDetail.steps[stepNum] = { ...step, ...submissionStatus };
        this.setIsPreviousTestTaken(step, stepNum, stepClickedNum, submissionStatus.attempts);
      });
      return;
    }
    this.setIsPreviousTestTaken(step, stepNum, stepClickedNum, step.attempts);
  }

  getStepSubmission(step) {
    this.submissionsService.openSubmission({
      parentId: step.exam._id + '@' + this.courseDetail._id,
      parent: step.exam,
      user: this.userService.get(),
      type: 'exam' });
    return this.submissionsService.submissionUpdated$.pipe(
      filter(({ submission }) => submission.parent._id === step.exam._id),
      take(1)
    ).pipe(map(({ submission, attempts }) => ({
      examText: submission.answers.length > 0 ? 'continue' : attempts === 0 ? 'take' : 'retake',
      submission,
      attempts
    })));
  }

  setIsPreviousTestTaken(step, stepNum, stepClickedNum, attempts) {
    const stepClicked = this.courseDetail.steps[stepClickedNum];
    const isTestTaken = attempts > 0 || (stepNum === 0 && step.exam === undefined);
    stepClicked.isPreviousTestTaken = (stepNum !== stepClickedNum && isTestTaken) || stepClicked.isPreviousTestTaken;
  }

  viewStep() {
    const stepNum = this.activeStepInfo?.stepNum || 1;
    this.router.navigate([ './step/' + stepNum ], { relativeTo: this.route });
  }

  goToSurvey(stepNum, preview = false) {
    this.router.navigate(
      [ `./step/${stepNum + 1}/exam`, { questionNum: 1, type: 'survey', preview, examId: this.courseDetail.steps[stepNum].survey._id } ],
      { relativeTo: this.route }
    );
  }

  goToExam(step, stepIndex, preview = false) {
    const questionNum = (this.submissionsService.nextQuestion(step.submission, step.submission.answers.length - 1, 'passed') + 1) || 1;
    const stepNum = stepIndex + 1;
    this.router.navigate(
      [
        `./step/${stepNum}/exam`,
        { id: this.courseId, stepNum, questionNum, type: 'exam', preview, examId: this.courseDetail.steps[stepIndex].exam._id }
      ],
      { relativeTo: this.route }
    );
  }

  previewButtonClick(step: any, stepNum: any): void {
    const stepType = this.coursesService.stepHasExamSurveyBoth(step);
    if (stepType === 'both' || stepType === undefined) {
      return;
    }
    this.previewButton.closeMenu();
    if (stepType === 'exam') {
      this.goToExam(step, stepNum, true);
    }
    if (stepType === 'survey') {
      this.goToSurvey(stepNum, true);
    }
  }

  checkMyCourses(courseId: string) {
    return this.userService.shelf.courseIds.includes(courseId);
  }

  updateRating(itemId) {
    this.coursesService.requestCourse({ courseId: itemId, forceLatest: true });
  }

  courseToggle(courseId, type) {
    const courseTitle = this.courseDetail.courseTitle;
    this.coursesService.courseResignAdmission(courseId, type, courseTitle).subscribe((res) => {
      this.isUserEnrolled = !this.isUserEnrolled;
      this.activeStepInfo = this.coursesService.getActiveStep(this.courseDetail, this.progress, this.submissions);
    }, (error) => ((error)));
  }

  toggleFullView(type) {
    this.currentView = type;
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

  updateCourse() {
    this.router.navigate([ 'update' ], { relativeTo: this.route });
  }
  /**
   * If returnState is set in history, it will navigate to that page.(teams/enterprises)
   * Returns routing to previous parent page on Courses
   */
  goBack() {
    const returnState = history.state?.returnState;
    if (returnState) {
      this.router.navigate([ `${returnState.route}` ]);
      return;
    }
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

}
