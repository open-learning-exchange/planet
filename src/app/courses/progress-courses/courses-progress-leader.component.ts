import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { dedupeShelfReduce } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { StateService } from '../../shared/state.service';
import { ManagerService } from '../../manager-dashboard/manager.service';
import { ReportsService } from '../../manager-dashboard/reports/reports.service';

@Component({
  templateUrl: 'courses-progress-leader.component.html',
  styleUrls: [ 'courses-progress.scss' ]
})
export class CoursesProgressLeaderComponent implements OnInit, OnDestroy {

  course: any;
  // Need to define this variable for template which is shared with CoursesProgressLearner
  headingStart = '';
  chartLabel = 'Steps';
  selectedStep: any;
  chartData: any[];
  submissions: any[] = [];
  progress: any[] = [];
  onDestroy$ = new Subject<void>();
  yAxisLength = 0;
  submittedExamSteps: any[] = [];
  configuration = this.stateService.configuration;
  planets: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private dialogsLoadingService: DialogsLoadingService,
    private stateService: StateService,
    private managerService: ManagerService,
    private reportsService: ReportsService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
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
      this.dialogsLoadingService.stop();
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setProgress(course) {
    let planetCodes: any[] = [];
    this.coursesService.findProgress([ course._id ], { allUsers: true }).pipe(switchMap((progress) => {
      this.progress = progress;
      planetCodes = this.progress.map(item => item.createdOn).reduce(dedupeShelfReduce, []);
      return this.planets.length > 1 ? this.managerService.getChildPlanets(true) : of([]);
    })).subscribe((planetDocs) => {
      const planetsWithName = this.reportsService.attachNamesToPlanets(planetDocs);
      this.planets = planetCodes.map(planetCode => {
        const planetWithName = planetsWithName.find(withName => withName.doc.code === planetCode);
        return {
          code: planetCode,
          name: planetWithName && ((planetWithName.nameDoc || {}).name || planetWithName.doc.name)
        };
      });
      this.setSubmissions();
    });
  }

  onStepChange(value: any) {
    this.selectedStep = value;
    this.setSingleStep(this.submissions);
  }

  onPlanetChange(value: string) {
    if (this.selectedStep === undefined) {
      this.setFullCourse(this.submissions, value);
    } else {
      this.setSingleStep(this.submissions, value);
    }
  }

  setSubmissions() {
    this.chartData = [];
    this.submissionsService.updateSubmissions({ parentId: this.course._id });
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
    return answer.grade === undefined ? '' : answer.mistakes || (1 - answer.grade);
  }

  userCourseAnswers(user: any, step: any, index: number, submissions: any[]) {
    const userProgress = this.userProgress(user);
    if (!step.exam) {
      return { number: '', fill: userProgress.stepNum > index };
    }
    const submission =
      submissions.find((sub: any) => sub.user.name === user && sub.parentId === (step.exam._id + '@' + this.course._id));
    if (submission) {
      return this.totalSubmissionAnswers(submission);
    }
    return { number: '', fill: false, clickable: true };
  }

  setFullCourse(submissions: any[], planetCode?: string) {
    this.selectedStep = undefined;
    this.headingStart = this.course.courseTitle;
    this.yAxisLength = this.course.steps.length;
    const users = submissions
      .filter((sub: any) => planetCode === undefined || sub.source === planetCode)
      .map((sub: any) => sub.user.name)
      .reduce(dedupeShelfReduce, []);
    this.chartData = users.map((user: string) => {
      const answers = this.course.steps.map((step: any, index: number) => {
        return this.userCourseAnswers(user, step, index, submissions);
      }).reverse();
      return ({
        items: answers,
        label: user
      });
    });
  }

  setSingleStep(submissions: any[], planetCode?: string) {
    const step = this.selectedStep;
    this.headingStart = this.selectedStep.stepTitle;
    this.yAxisLength = this.selectedStep.exam.questions.length;
    this.chartData = submissions
      .filter(submission =>
        submission.parentId === (step.exam._id + '@' + this.course._id) &&
        (planetCode === undefined || planetCode === submission.source)
      ).map(submission => {
        const answers = this.arraySubmissionAnswers(submission);
        return {
          items: answers,
          label: submission.user.name
        };
      });
  }

  changeData({ index }) {
    const courseIndex = this.course.steps.length - (index + 1);
    if (this.selectedStep === undefined && this.course.steps[courseIndex].exam) {
      this.selectedStep = this.course.steps[courseIndex];
      this.setSingleStep(this.submissions);
    }
    this.chartLabel = 'Quest.';
  }

  resetToFullCourse() {
    this.setFullCourse(this.submissions);
    this.chartLabel = 'Steps';
  }

  userProgress(user) {
    return (this.progress
      .filter((p: any) => p.userId === 'org.couchdb.user:' + user)
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

}
