import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { CsvService } from '../../shared/csv.service';
import { dedupeObjectArray } from '../../shared/utils';
import { findDocuments } from '../../shared/mangoQueries';
import { UserProfileDialogComponent } from '../../users/users-profile/users-profile-dialog.component';
import { StateService } from '../../shared/state.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet, DatePipe, NgClass } from '@angular/common';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { PlanetSelectorComponent } from '../../shared/forms/planet-selector.component';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';
import { TruncateTextPipe } from '../../shared/truncate-text.pipe';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatChipSet, MatChip } from '@angular/material/chips';
import {
  MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell,
  MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow
} from '@angular/material/table';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  templateUrl: 'courses-progress-leader.component.html',
  styleUrls: ['./courses-progress.scss'],
  imports: [
    MatToolbar,
    MatIcon,
    NgTemplateOutlet,
    NgClass,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    PlanetSelectorComponent,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatSelect,
    MatOption,
    MatButton,
    PlanetLoadingSpinnerComponent,
    TruncateTextPipe,
    MatCard,
    MatCardContent,
    MatProgressBar,
    MatChipSet,
    MatChip,
    MatTable,
    MatSort,
    MatSortHeader,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
    MatPaginator,
    MatInput,
    MatTooltip,
    AvatarComponent,
    DatePipe
  ]
})
export class CoursesProgressLeaderComponent implements OnInit, AfterViewChecked, OnDestroy {

  course: any;
  headingStart = '';
  chartLabel = $localize`Steps`;
  selectedStep: any;
  allChartData: any[] = [];
  chartData: any[];
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

  totalLearners = 0;
  avgCompletionPercentage = 0;
  pendingGradesCount = 0;
  totalErrorsCount = 0;
  displayedColumns = [ 'user', 'progress', 'stepStatus', 'totalErrors', 'lastActive', 'actions' ];
  dataSource = new MatTableDataSource<any>();
  stepDifficultyList: any[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private csvService: CsvService,
    private dialog: MatDialog,
    private stateService: StateService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });

    this.dataSource.filterPredicate = (data: any, filter: string) => {
      return data.user.name.toLowerCase().includes(filter) || data.user.planetCode.toLowerCase().includes(filter);
    };
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
    });
  }

  ngAfterViewChecked() {
    if (this.paginator && !this.dataSource.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort && !this.dataSource.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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

  navigateToGrading() {
    if (this.course?._id) {
      this.router.navigate([ '/courses/submissions', this.course._id ]);
    }
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
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
    this.totalLearners = users.length;

    let totalPctSum = 0;
    let pendingCount = 0;
    let totalErrors = 0;

    const learnerRows = users.map((user: any) => {
      const userProgressDoc = this.userProgress(user);
      const userSubmissions = submissions.filter((sub: any) => sub.user.name === user.name && sub.source === user.planetCode);
      const passedExamSteps = userSubmissions.filter((s: any) => s.status === 'complete').length;
      const stepNumCompleted = Math.max(userProgressDoc?.stepNum || 0, passedExamSteps);
      const totalSteps = Math.max(this.course.steps.length, 1);
      const completionPercentage = Math.min(100, Math.round((stepNumCompleted / totalSteps) * 100));
      totalPctSum += completionPercentage;
      let userErrorCount = 0;
      let lastActiveTimestamp = 0;

      const stepStatuses = this.course.steps.map((step: any, index: number) => {
        let stepStatus = 'not_started';
        let stepErrCount = 0;

        if (step.exam) {
          const sub = userSubmissions.find((s: any) => s.parentId === (step.exam._id + '@' + this.course._id));
          if (sub) {
            stepStatus = sub.status;
            stepErrCount = this.totalSubmissionAnswers(sub).number || 0;
            userErrorCount += stepErrCount;
            if (sub.status === 'requires grading') {
              pendingCount++;
            }
            if (sub.lastUpdateTime && sub.lastUpdateTime > lastActiveTimestamp) {
              lastActiveTimestamp = sub.lastUpdateTime;
            }
          } else if (stepNumCompleted > index) {
            stepStatus = 'complete';
          } else if (stepNumCompleted === index) {
            stepStatus = 'in_progress';
          }
        } else {
          if (stepNumCompleted > index) {
            stepStatus = 'complete';
          } else if (stepNumCompleted === index) {
            stepStatus = 'in_progress';
          }
        }

        return {
          stepIndex: index + 1,
          stepTitle: step.stepTitle || `Step ${index + 1}`,
          status: stepStatus,
          errors: stepErrCount
        };
      });

      totalErrors += userErrorCount;

      return {
        user,
        stepNum: stepNumCompleted,
        completionPercentage,
        stepStatuses,
        totalErrors: userErrorCount,
        lastActive: lastActiveTimestamp || null
      };
    });

    this.avgCompletionPercentage = users.length ? Math.round(totalPctSum / users.length) : 0;
    this.pendingGradesCount = pendingCount;
    this.totalErrorsCount = totalErrors;

    this.dataSource.data = learnerRows;
    this.calculateStepDifficulty(submissions);

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

  calculateStepDifficulty(submissions: any[]) {
    this.stepDifficultyList = this.course.steps.map((step: any, index: number) => {
      let stepErrors = 0;
      let stepPending = 0;
      let passCount = 0;

      const sanitizedTitle = step.stepTitle && !step.stepTitle.startsWith(`Step ${index + 1}`)
        ? `Step ${index + 1}: ${step.stepTitle}`
        : (step.stepTitle || `Step ${index + 1}`);

      if (step.exam) {
        const stepSubs = submissions.filter((s: any) => s.parentId === (step.exam._id + '@' + this.course._id));
        stepSubs.forEach((sub: any) => {
          stepErrors += this.totalSubmissionAnswers(sub).number || 0;
          if (sub.status === 'requires grading') {
            stepPending++;
          }
          if (sub.status === 'complete') {
            passCount++;
          }
        });

        const passPercentage = stepSubs.length ? Math.round((passCount / stepSubs.length) * 100) : 0;
        return {
          stepIndex: index + 1,
          stepTitle: sanitizedTitle,
          hasExam: true,
          submissionCount: stepSubs.length,
          totalErrors: stepErrors,
          pendingCount: stepPending,
          passPercentage
        };
      }

      return {
        stepIndex: index + 1,
        stepTitle: sanitizedTitle,
        hasExam: false,
        submissionCount: 0,
        totalErrors: 0,
        pendingCount: 0,
        passPercentage: 100
      };
    });
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
    this.submittedExamSteps = [];
    this.course.steps
      .forEach((step: any, index: number) => {
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

  memberClick(user: any) {
    const name = user.name || user.label;
    const userPlanetCode = user.planetCode || user.source;
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
        steps[$localize`Step ${(index + 1)}`] = stepErrors;
      });

      return {
        [$localize`Username`]: element.label,
        [$localize`Success Percentage`]: `${((successfulSteps / totalSteps) * 100).toFixed(2)}%`,
        [$localize`Total Errors`]: totalErrors,
        ...steps
      };
    });
  }

  exportChartData() {
    const planetName = this.stateService.configuration.name;
    const courseTitle = this.course.courseTitle;
    const entityLabel = this.configuration.planetType === 'nation' ? $localize`Nation` : $localize`Community`;
    const title = $localize`${courseTitle} Course Progress for ${entityLabel} ${planetName}`;

    const structuredData = this.structureChartData(this.chartData);
    this.csvService.exportCSV({
      data: structuredData,
      title: title
    });
  }

}
