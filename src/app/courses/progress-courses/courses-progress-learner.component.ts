import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  headingStart = ((this.user.firstName || '') + ' ' + (this.user.lastName || '')).trim() || this.user.name;
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
    this.coursesService.progressLearnerListener$().pipe(takeUntil(this.onDestroy$)).subscribe((courses: any[]) => {
      if (courses === undefined) {
        return;
      }
      this.courses = courses;
      this.createChart(courses, this.submissions);
    });
    this.submissionsService.submissionsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((submissions: any[]) => {
      this.submissions = submissions;
      this.createChart(this.courses, submissions);
    });
    this.submissionsService.updateSubmissions({ query: { 'selector': { 'user.name': this.user.name } } });
    this.coursesService.requestCourses();
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

  createChartData(courses = [], submissions) {
    return courses.map((course: any) => ({
      label: course.doc.courseTitle,
      courseId: course._id,
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

  courseBySteps({ doc, progress }, submissions) {
    return doc.steps.map((step: any, index: number) => {
      const fill = progress.findIndex((prog: any) => prog.stepNum === index + 1) > -1;
      if (!step.exam) {
        return { number: '', fill };
      }
      return {
        number: this.bestSubmission(submissions.filter(submission => submission.parentId.indexOf(step.exam._id) > -1)),
        fill
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
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  changeData(event) {}

  handleCourseClick(event: any) {
    if (event.courseId) {
      this.router.navigate([ '/courses', 'view', event.courseId ]);
    }
  }

}
