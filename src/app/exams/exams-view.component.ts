import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses/courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { takeUntil } from 'rxjs/operators';

@Component({
  templateUrl: './exams-view.component.html'
})

export class ExamsViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  question: any = { header: '', body: '', type: '', choices: [] };
  questionNum = 0;
  stepNum = 0;
  maxQuestions = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe((course: any) => {
      // To be readable by non-technical people stepNum & questionNum param will start at 1
      const questions = course.steps[this.stepNum - 1].exam.questions;
      this.question = questions[this.questionNum - 1];
      this.maxQuestions = questions.length;
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.questionNum = +params.get('questionNum'); // Leading + forces string to number
      this.stepNum = +params.get('stepNum');
      this.coursesService.requestCourse({ courseId: params.get('id') });
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  nextQuestion(questionNum: number) {
    if (questionNum === this.maxQuestions) {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '../', this.questionNum + 1 ], { relativeTo: this.route });
    }
  }

}
