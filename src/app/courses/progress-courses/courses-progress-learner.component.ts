import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: 'courses-progress-learner.component.html',
  styleUrls: [ 'courses-progress.scss' ]
})
export class CoursesProgressLearnerComponent implements OnInit, OnDestroy {

  user = this.userService.get();
  // Need to define this variable for template which is shared with CoursesProgressLeader
  course;
  headingStart = this.user.firstName + ' ' + this.user.lastName;
  courses: any[] = [];
  submissions: any[] = [];
  chartData: any[];
  onDestroy$ = new Subject<void>();
  yAxisLength = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true });
    });
    this.coursesService.coursesUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((courses: any[]) => {
      this.courses = courses;
      this.createChart(courses, this.submissions);
    });
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submissions: any[]) => {
      this.submissions = submissions;
      this.createChart(this.courses, submissions);
    });
    this.submissionsService.updateSubmissions({ query: { 'selector': { 'user.name': this.user.name } } });
    this.coursesService.getUsersCourses(this.user._id);
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  createChart(courses, submissions) {
    this.chartData = this.createChartData(
      courses,
      this.totalMistakes(submissions)
    );
    this.yAxisLength = this.calculateChartHeight(this.chartData);
  }

  createChartData(courses, submissions) {
    return courses.map((course: any) => ({
      label: course.courseTitle,
      items: this.courseBySteps(
        course,
        submissions.filter(submission => submission.parentId.indexOf(course._id) > -1)
      ).reverse()
    }));
  }

  totalMistakes(submissions) {
    return submissions.map((submission) => ({
      ...submission,
      totalMistakes: submission.answers.reduce((total, a) => total + (a.mistakes || (1 - a.grade) || 0), 0)
    }));
  }

  courseBySteps(course, submissions) {
    return course.steps.map((step: any) => {
      if (!step.exam) {
        return { number: '', fill: true };
      }
      return {
        number: this.bestSubmission(submissions.filter(submission => submission.parentId.indexOf(step.exam._id) > -1)),
        fill: true
      };
    });
  }

  bestSubmission(submissions) {
    if (submissions.length === 0) {
      return '';
    }
    return Math.min(...submissions.map(submission => submission.totalMistakes));
  }

  calculateChartHeight(chartData) {
    return Math.max(...chartData.map(set => set.items.length));
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

  changeData(event) {}

}
