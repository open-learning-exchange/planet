import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses/courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './exams-view.component.html',
  styleUrls: [ './exams-view.scss' ]
})

export class ExamsViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  question: any = { header: '', body: '', type: '', choices: [] };
  questionNum = 0;
  stepNum = 0;
  maxQuestions = 0;
  answer: any = undefined;
  incorrectAnswer = false;
  spinnerOn = true;
  mode = 'take';
  grade;
  submissionId: string;
  fromSubmission = false;
  currentRoute;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private couchService: CouchService
  ) { }

  ngOnInit() {
    this.setCourseListener();
    this.setSubmissionListener();
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.questionNum = +params.get('questionNum'); // Leading + forces string to number
      this.stepNum = +params.get('stepNum');
      const courseId = params.get('id');
      const submissionId = params.get('submissionId');
      const surveyId = params.get('surveyId');
      const mode = params.get('mode');
      this.spinnerOn = true;
      if (courseId) {
        this.coursesService.requestCourse({ courseId });
        this.incorrectAnswer = false;
        this.grade = 0;
      } else if (surveyId) {
        this.getSurvey(surveyId);
        this.grade = 0;
      } else if (submissionId) {
        this.fromSubmission = true;
        this.mode = mode || 'grade';
        this.grade = mode === 'take' ? 0 : undefined;
        this.submissionsService.openSubmission({ submissionId, 'status': params.get('status') });
      }
    });
    this.currentRoute = this.route.snapshot.data.mySurveys === true ? 'survey' : 'exam';
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  nextQuestion(questionNum: number) {
    const close = questionNum === this.maxQuestions;
    let correctAnswer;
    let obs: any;
    switch (this.mode) {
      case 'take':
        correctAnswer = this.question.correctChoice ? this.answer.id === this.question.correctChoice : correctAnswer;
        obs = this.submissionsService.submitAnswer(this.answer, correctAnswer, this.questionNum - 1, correctAnswer !== false && close);
        this.answer = undefined;
        break;
      case 'grade':
        obs = this.submissionsService.submitGrade(this.grade, this.questionNum - 1, close);
        break;
      default:
        obs = of({});
        break;
    }
    // Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.subscribe(() => {
      if (correctAnswer === false) {
        this.incorrectAnswer = true;
        this.spinnerOn = false;
      } else {
        this.routeToNext(close);
      }
    });
  }

  routeToNext (close) {
    if (close) {
      this.examComplete();
    } else {
      this.moveQuestion(1);
    }
  }

  moveQuestion(direction: number) {
    this.router.navigate([ { ...this.route.snapshot.params, questionNum: this.questionNum + direction } ], { relativeTo: this.route });
    this.spinnerOn = false;
  }

  examComplete() {
    if (this.route.snapshot.data.newUser === true) {
      this.router.navigate([ '/users/submission', { id: this.submissionId } ]);
    } else {
      this.goBack();
    }
  }

  goBack() {
    this.router.navigate([ '../' ], { relativeTo: this.route });
  }

  setTakingExam(exam, parentId, type) {
    const user = this.route.snapshot.data.newUser === true ? {} : this.userService.get();
    this.setQuestion(exam.questions);
    this.submissionsService.openSubmission({
      parentId,
      parent: exam,
      user,
      type });
  }

  setQuestion(questions: any[]) {
    this.question = questions[this.questionNum - 1];
    this.maxQuestions = questions.length;
  }

  setCourseListener() {
    this.coursesService.courseUpdated$
    .pipe(takeUntil(this.onDestroy$))
    .subscribe(({ course, progress }: { course: any, progress: any }) => {
      // To be readable by non-technical people stepNum & questionNum param will start at 1
      const step = course.steps[this.stepNum - 1];
      this.setTakingExam(step.exam, step.exam._id + '@' + course._id, 'exam');
    });
  }

  setSubmissionListener() {
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      this.submissionId = submission._id;
      if (this.fromSubmission === true) {
        this.setQuestion(submission.parent.questions);
        const ans = submission.answers[this.questionNum - 1];
        this.answer = ans ? ans.value : undefined;
        this.grade = ans ? ans.grade || this.grade : this.grade;
      }
    });
  }

  getSurvey(surveyId: string) {
    this.couchService.get('exams/' + surveyId).subscribe((survey) => {
      this.setTakingExam(survey, survey._id, 'survey');
    });
  }

  setAnswer(event, option) {
    this.answer = this.answer === undefined ? [] : this.answer;
    if (event.checked === true) {
      this.answer.push(option);
    } else if (event.checked === false) {
      this.answer.splice(this.answer.indexOf(option), 1);
    }
  }

}
