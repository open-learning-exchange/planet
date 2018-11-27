import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../shared/user.service';
import { SubmissionsService } from '../../submissions/submissions.service';

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
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit() {
    this.coursesService.courseUpdated$
    .pipe(takeUntil(this.onDestroy$))
    .subscribe(({ course, progress = { stepNum: 0 } }: { course: any, progress: any }) => {
      // To be readable by non-technical people stepNum param will start at 1
      this.stepDetail = course.steps[this.stepNum - 1];
      this.progress = progress;
      if (!this.parent && this.stepNum > progress.stepNum) {
        this.coursesService.updateProgress({ courseId: course._id, stepNum: this.stepNum, progress });
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
      this.resource = this.stepDetail.resources ? this.stepDetail.resources[0] : undefined;
      this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe(({ submission, attempts, bestAttempt = { grade: 0 } }) => {
        this.examStart = submission.answers.reduce((totalPassed, answer) => totalPassed + (answer.passed ? 1 : 0), 0) + 1;
        this.attempts = attempts;
        const examPercent = (bestAttempt.grade / this.stepDetail.exam.totalMarks) * 100;
        this.examPassed = examPercent >= this.stepDetail.exam.passingPercentage;
        if (!this.parent && this.progress.passed !== this.examPassed) {
          this.coursesService.updateProgress({
            courseId: this.courseId, stepNum: this.stepNum, passed: this.examPassed, progress: this.progress
          });
        }
      });
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.parent = this.route.snapshot.data.parent;
      this.stepNum = +params.get('stepNum'); // Leading + forces string to number
      this.courseId =  params.get('id');
      this.coursesService.requestCourse({ courseId: this.courseId, parent: this.parent });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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

}
