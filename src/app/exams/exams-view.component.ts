import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses/courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Component({
  templateUrl: './exams-view.component.html'
})

export class ExamsViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  question: any = { header: '', body: '', type: '', choices: [] };
  questionNum = 0;
  stepNum = 0;
  maxQuestions = 0;
  answer: string | number = '';
  mode = 'take';
  grade;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$
    .pipe(takeUntil(this.onDestroy$))
    .subscribe(({ course, progress }: { course: any, progress: any }) => {
      // To be readable by non-technical people stepNum & questionNum param will start at 1
      const step = course.steps[this.stepNum - 1];
      this.setQuestion(step.exam.questions);
      this.submissionsService.openSubmission({
        parentId: step.exam._id + '@' + course._id,
        parent: step.exam,
        user: this.userService.get().name,
        type: 'exam' });
    });
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      if (this.mode === 'grade') {
        this.setQuestion(submission.parent.questions);
        this.answer = submission.answers[this.questionNum - 1];
        this.grade = submission.grades[this.questionNum - 1 ];
      }
    });
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.questionNum = +params.get('questionNum'); // Leading + forces string to number
      this.stepNum = +params.get('stepNum');
      const courseId = params.get('id');
      const submissionId = params.get('submissionId');
      if (courseId) {
        this.coursesService.requestCourse({ courseId });
      } else if (submissionId) {
        this.mode = 'grade';
        this.grade = undefined;
        this.submissionsService.openSubmission({ submissionId, 'status': params.get('status') });
      }
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  nextQuestion(questionNum: number) {
    const close = questionNum === this.maxQuestions;
    let obs: any;
    switch (this.mode) {
      case 'take':
        obs = this.submissionsService.submitAnswer(this.answer, this.questionNum - 1, close);
        break;
      case 'grade':
        obs = this.submissionsService.submitGrade(this.grade, this.questionNum - 1, close);
        break;
    }
    this.answer = '';
    // Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.subscribe(() => {
      if (close) {
        this.goBack();
      } else {
        this.router.navigate([ { ...this.route.snapshot.params, questionNum: this.questionNum + 1 } ], { relativeTo: this.route });
      }
    });
  }

  goBack() {
    this.router.navigate([ '../' ], { relativeTo: this.route });
  }

  setQuestion(questions: any[]) {
    this.question = questions[this.questionNum - 1];
    this.maxQuestions = questions.length;
  }

}
