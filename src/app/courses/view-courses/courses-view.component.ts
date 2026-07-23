import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, take, filter, map } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
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
import { MatDialog } from '@angular/material/dialog';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';
import { of } from 'rxjs';

@Component({
  templateUrl: './courses-view.component.html',
  styleUrls: ['courses-view.scss'],
  imports: [
    MatToolbar,
    MatIconAnchor,
    MatIcon,
    NgTemplateOutlet,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatButton,
    CoursesProgressBarComponent,
    NgClass,
    CoursesViewDetailComponent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    CoursesIconComponent,
    PlanetMarkdownComponent,
    MatExpansionPanelActionRow,
    ResourcesMenuComponent,
    MatAnchor,
    MatMenuItem,
    PlanetLoadingSpinnerComponent,
    DialogsPromptComponent
  ]
})
export class CoursesViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  courseDetail: any = { steps: [] };
  parent = this.route.snapshot.data.parent;
  isUserEnrolled = false;
  progress = [ { stepNum: 1 } ];
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
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService
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
        this.canManage = (this.currentUser.isUserAdmin && !this.parent) ||
          this.courseDetail.creator !== undefined &&
          (this.currentUser.name === this.courseDetail.creator.slice(0, this.courseDetail.creator.indexOf('@')));
        return this.stateService.getCouchState('exams', 'local');
      }),
      takeUntil(this.onDestroy$)
    ).subscribe((exams) => {
      const stepExam = (step) => step.exam && exams.find(exam => exam._id === step.exam._id) || step.exam;
      this.courseDetail.steps = this.courseDetail.steps.map(step => ({ ...step, exam: stepExam(step) }));
    }, () => this.isLoading = false);
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
    const latestStep = this.progress.reduce((stepNum, prog) => {
      return prog.stepNum > stepNum ? prog.stepNum : stepNum;
    }, 1);
    this.router.navigate([ './step/' + latestStep ], { relativeTo: this.route });
  }

  private resolveStepAndIndex(
    stepOrIndex: any, indexOrPreview?: any, previewParam = false
  ): { stepDetail: any, stepIndex: number, preview: boolean } {
    let stepIndex: number;
    let preview = previewParam;

    if (typeof stepOrIndex === 'number') {
      stepIndex = stepOrIndex;
      if (typeof indexOrPreview === 'boolean') {
        preview = indexOrPreview;
      }
    } else if (typeof indexOrPreview === 'number') {
      stepIndex = indexOrPreview;
    } else {
      stepIndex = 0;
    }

    if (typeof indexOrPreview === 'boolean') {
      preview = indexOrPreview;
    }

    const stepDetail = (typeof stepIndex === 'number' && this.courseDetail?.steps?.[stepIndex])
      ? this.courseDetail.steps[stepIndex]
      : (typeof stepOrIndex === 'object' && stepOrIndex ? stepOrIndex : {});
    return { stepDetail, stepIndex, preview };
  }

  navigateToSurvey(stepOrIndex: any, indexOrPreview?: any, previewParam = false) {
    const { stepDetail, stepIndex, preview } = this.resolveStepAndIndex(stepOrIndex, indexOrPreview, previewParam);
    const stepNum = stepIndex + 1;
    const examId = stepDetail?.survey?._id;
    this.router.navigate(
      [ `./step/${stepNum}/exam`, { questionNum: 1, type: 'survey', preview, examId } ],
      { relativeTo: this.route }
    );
  }

  goToSurvey(stepOrIndex: any, indexOrPreview?: any, previewParam = false) {
    const { stepDetail, stepIndex, preview } = this.resolveStepAndIndex(stepOrIndex, indexOrPreview, previewParam);
    const displayName = stepDetail?.survey?.name || stepDetail?.survey?.displayName || stepDetail?.survey?.title || 'survey';
    if (preview) {
      this.navigateToSurvey(stepDetail, stepIndex, true);
      this.planetMessageService.showMessage(`Previewing ${displayName}`);
      return;
    }
    const courseTitle = this.courseDetail?.courseTitle || this.courseDetail?.title || '';
    const displayStepNum = stepIndex + 1;
    const formType = $localize`Survey`;
    const extraMessage = $localize`Course: <b>${courseTitle}</b>` +
      `<br>Step: <b>${stepDetail?.stepTitle || 'Step ' + displayStepNum}</b>` +
      `<br>Form Type: <b>${formType}</b>` +
      '<br/></br>' +
      '<br>Total Questions: <b>' + (stepDetail?.exam?.questions?.length || 0) + '</b>';

    const dialogRef = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: of(true),
          onNext: () => {
            dialogRef.close();
            this.navigateToSurvey(stepDetail, stepIndex, preview);
            const message = `Starting ${displayName}`;
            this.planetMessageService.showMessage(message);
          },
          onError: () => {
            dialogRef.close();
          }
        },
        changeType: 'take',
        type: 'survey',
        extraMessage,
      }
    });
  }

  navigateToExam(stepOrIndex: any, indexOrPreview?: any, previewParam = false) {
    const { stepDetail, stepIndex, preview } = this.resolveStepAndIndex(stepOrIndex, indexOrPreview, previewParam);
    const submission = stepDetail?.submission;
    const questionNum = submission?.answers ?
      (this.submissionsService.nextQuestion(submission, submission.answers.length - 1, 'passed') + 1) || 1 : 1;
    const stepNum = stepIndex + 1;
    const examId = stepDetail?.exam?._id;
    this.router.navigate(
      [
        `./step/${stepNum}/exam`,
        { id: this.courseId, stepNum, questionNum, type: 'exam', preview, examId }
      ],
      { relativeTo: this.route }
    );
  }

  goToExam(stepOrIndex: any, indexOrPreview?: any, previewParam = false) {
    const { stepDetail, stepIndex, preview } = this.resolveStepAndIndex(stepOrIndex, indexOrPreview, previewParam);
    const displayName = stepDetail?.exam?.name || stepDetail?.exam?.displayName || stepDetail?.exam?.title || 'exam';
    if (preview) {
      this.navigateToExam(stepDetail, stepIndex, true);
      this.planetMessageService.showMessage(`Previewing ${displayName}`);
      return;
    }
    const courseTitle = this.courseDetail?.courseTitle || this.courseDetail?.title || '';
    const displayStepNum = stepIndex + 1;
    const formType = $localize`Exam`;
    const extraMessage = $localize`Course: <b>${courseTitle}</b>` +
      `<br>Step: <b>${stepDetail?.stepTitle || 'Step ' + displayStepNum}</b>` +
      `<br>Form Type: <b>${formType}</b>` +
      '<br/></br>' +
      '<br>Total Questions: <b>' + (stepDetail?.exam?.questions?.length || 0) + '</b>';

    const dialogRef = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: of(true),
          onNext: () => {
            dialogRef.close();
            this.navigateToExam(stepDetail, stepIndex, preview);
            const message = `Starting ${displayName}`;
            this.planetMessageService.showMessage(message);
          },
          onError: () => {
            dialogRef.close();
          }
        },
        changeType: stepDetail?.attempts > 0 ? 'retake' : 'take',
        type: 'exam',
        extraMessage,
      }
    });
  }

  previewButtonClick(step: any, stepNum: any): void {
    const stepType = this.coursesService.stepHasExamSurveyBoth(step);
    if (stepType === 'both' || stepType === undefined) {
      return;
    }
    this.previewButton?.closeMenu();
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
