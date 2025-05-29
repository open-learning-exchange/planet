import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { CsvService } from '../../shared/csv.service';
import { dedupeObjectArray } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { findDocuments } from '../../shared/mangoQueries';
import { UserProfileDialogComponent } from '../../users/users-profile/users-profile-dialog.component';
import { StateService } from '../../shared/state.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';

@Component({
  templateUrl: 'courses-progress-leader.component.html',
  styles: [ `
    mat-toolbar.primary-color {
      padding-top: 8px;
    }
  ` ]
})
export class CoursesProgressLeaderComponent implements OnInit, OnDestroy {

  course: any;
  headingStart = '';
  chartLabel = $localize`Steps`;
  selectedStep: any;
  allChartData: any[] = [];
  chartData: any[];
  csvChartData: any[];
  submissions: any[] = [];
  progress: any[] = [];
  onDestroy$ = new Subject<void>();
  yAxisLength = 0;
  submittedExamSteps: any[] = [];
  planetCodes: string[] = [];
  selectedPlanetCode: string;
  configuration: any = {};
  deviceType: DeviceType;
  deviceTypes = DeviceType;
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private csvService: CsvService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog,
    private stateService: StateService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.dialogsLoadingService.start();
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.isLoading = true;
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true });
    });
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ course }) => {
      this.course = course;
      this.setProgress(course);
    });
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submissions: any[]) => {
      this.submissions = submissions;
      this.setFullCourse(submissions);
      this.filterSubmittedExamSteps(submissions);
      this.isLoading = false;
      this.dialogsLoadingService.stop();
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  @HostListener('window:resize')
  onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  setProgress(course) {
    this.coursesService.findProgress([ course._id ], { allUsers: true }).subscribe((progress) => {
      this.progress = progress;
      this.planetCodes = progress.map((activity: any) => activity.createdOn).reduce((codes: string[], code: string) => [
        ...codes, ...(codes.indexOf(code) === -1 ? [ code ] : [])
      ], []);
      this.selectedPlanetCode = this.planetCodes.length === 1 ? this.planetCodes[0] : this.selectedPlanetCode;
      this.setSubmissions();
    });
  }

  onStepChange(value: any) {
    this.selectedStep = value;
    this.setSingleStep(this.submissions);
    this.chartLabel = $localize`Quest.`;
  }

  setSubmissions() {
    this.chartData = [];
    this.submissionsService.updateSubmissions({
      query: findDocuments({ parentId: { '$regex': this.course._id } }),
      onlyBest: true
    });
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

  arraySubmissionAnswers(submission: any) {
    return submission.answers.map(a => ({ number: this.answerErrorCount(a), fill: true })).reverse();
  }

  totalSubmissionAnswers(submission: any) {
    return {
      number: submission.answers.reduce((total, answer) => total + (this.answerErrorCount(answer) || 0), 0),
      fill: true,
      clickable: true
    };
  }

  answerErrorCount(answer) {
    return answer?.grade === undefined ? '' : answer?.mistakes || (1 - answer?.grade);
  }

  userCourseAnswers(user: any, step: any, index: number, submissions: any[]) {
    const userProgress = this.userProgress(user);
    if (!step.exam) {
      return { number: '', fill: userProgress.stepNum > index };
    }
    const submission = submissions.find((sub: any) => {
      return sub.user.name === user.name && sub.source === user.planetCode && sub.parentId === (step.exam._id + '@' + this.course._id);
    });
    if (submission) {
      return this.totalSubmissionAnswers(submission);
    }
    return { number: '', fill: false, clickable: true };
  }

  setFullCourse(submissions: any[]) {
    this.selectedStep = undefined;
    this.headingStart = this.course.courseTitle;
    this.yAxisLength = this.course.steps.length;
    const users = dedupeObjectArray(submissions.map((sub: any) => sub.user), [ 'name', 'planetCode' ]);
    this.allChartData = users.map((user: any) => {
      const answers = this.course.steps.map((step: any, index: number) => {
        return this.userCourseAnswers(user, step, index, submissions);
      }).reverse();
      return ({
        items: answers,
        label: user.name,
        planetCode: user.planetCode
      });
    });
    this.filterDataByPlanet();
  }

  setSingleStep(submissions: any[]) {
    const step = this.selectedStep;
    this.headingStart = this.selectedStep.stepTitle;
    this.yAxisLength = this.selectedStep.exam.questions.length;
    this.allChartData = submissions.filter(submission => submission.parentId === (step.exam._id + '@' + this.course._id)).map(
      submission => {
        const answers = this.arraySubmissionAnswers(submission);
        return {
          items: answers,
          label: submission.user.name,
          planetCode: submission.source
        };
      }
    );
    this.filterDataByPlanet();
  }

  changeData({ index }) {
    const courseIndex = this.course.steps.length - (index + 1);
    if (this.selectedStep === undefined && this.course.steps[courseIndex].exam) {
      this.selectedStep = this.course.steps[courseIndex];
      this.setSingleStep(this.submissions);
    }
    this.chartLabel = $localize`Quest.`;
  }

  resetToFullCourse() {
    this.setFullCourse(this.submissions);
    this.chartLabel = $localize`Steps`;
  }

  userProgress(user) {
    return (this.progress
      .filter((p: any) => p.userId === user._id && p.createdOn === user.planetCode)
      .reduce((max: any, p: any) => p.stepNum > max.stepNum ? p : max, { stepNum: 0 }));
  }

  isSubmittedExam(submissions: any[], step: any) {
    return (step.exam &&
            submissions.find((s: any) => s.parentId === (step.exam._id + '@' + this.course._id)));
  }

  filterSubmittedExamSteps(submissions: any[]) {
    this.course.steps
      .filter((step: any, index: number) => {
        if (this.isSubmittedExam(submissions, step)) {
          step.index = index;
          this.submittedExamSteps.push(step);
        }
      });
  }

  planetSelectionChange(planet) {
    this.selectedPlanetCode = planet.doc.code;
    this.filterDataByPlanet();
  }

  filterDataByPlanet() {
    this.chartData = this.allChartData.filter(data => data.planetCode === this.selectedPlanetCode);
  }

  memberClick({ label: name, planetCode: userPlanetCode }) {
    this.dialog.open(UserProfileDialogComponent, {
      data: { member: { name, userPlanetCode } },
      maxWidth: '90vw',
      maxHeight: '90vh'
    });
  }

  structureChartData(data) {
    return data.map(element => {
      let successfulSteps = 0;
      let totalSteps = 0;
      let totalErrors = 0;
      const steps = {};

      element.items.forEach((item, index) => {
        const stepErrors = item.number || 0;
        totalSteps++;
        if (stepErrors === 0) {
          successfulSteps++;
        }
        totalErrors += stepErrors;
        steps[`Step ${(index + 1)}`] = stepErrors;
      });

      return {
        'Username': element.label,
        'Success Percentage': `${((successfulSteps / totalSteps) * 100).toFixed(2)}%`,
        'Total Errors': totalErrors,
        ...steps
      };
    });
  }

  exportChartData() {
    const planetName = this.stateService.configuration.name;
    const courseTitle = this.course.courseTitle;
    const entityLabel = this.configuration.planetType === 'nation' ? 'Nation' : 'Community';
    const title = $localize`${courseTitle} Course Progress for ${entityLabel} ${planetName}`;

    const structuredData = this.structureChartData(this.chartData);
    this.csvService.exportCSV({
      data: structuredData,
      title: title
    });
  }

}
