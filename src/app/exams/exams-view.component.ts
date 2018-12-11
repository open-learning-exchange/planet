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
  title = '';
  grade;
  submissionId: string;
  status = '';
  submittedBy = '';
  updatedOn = '';
  fromSubmission = false;
  examType = this.route.snapshot.data.mySurveys === true || this.route.snapshot.paramMap.has('surveyId') ? 'surveys' : 'courses';
  checkboxState: any = {};

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
      this.answer = undefined;
      this.spinnerOn = true;
      if (courseId) {
        this.coursesService.requestCourse({ courseId });
        this.incorrectAnswer = false;
        this.grade = 0;
      } else if (submissionId) {
        this.fromSubmission = true;
        this.mode = mode || 'grade';
        this.grade = mode === 'take' ? 0 : undefined;
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
    const { correctAnswer, obs }: { correctAnswer: boolean | undefined, obs: any } = this.createAnswerObservable(close);
    // Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.subscribe(() => {
      if (correctAnswer === false) {
        this.incorrectAnswer = true;
        this.answer = undefined;
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

  isMultiCorrect(correctChoice, answers) {
    return correctChoice.every(choice => answers.find((a: any) => a.id === choice)) &&
      answers.every((a: any) => correctChoice.find(choice => a.id === choice));
  }

  resetCheckboxes() {
    this.question.choices.forEach((choice: any) => this.checkboxState[choice.id] = false);
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

  setTakingExam(exam, parentId, type, title) {
    const user = this.route.snapshot.data.newUser === true ? {} : this.userService.get();
    this.setQuestion(exam.questions);
    this.title = title;
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
      this.setTakingExam(step.exam, step.exam._id + '@' + course._id, 'exam', step.stepTitle);
    });
  }

  setSubmissionListener() {
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      this.status = submission.status;
      this.submittedBy = submission.user;
      this.updatedOn = submission.startTime;

      this.submissionId = submission._id;
      if (this.fromSubmission === true) {
        this.examType = submission.parent.type;
        this.title = submission.parent.name;
        this.setQuestion(submission.parent.questions);
        const ans = submission.answers[this.questionNum - 1] || {};
        if (this.mode === 'take') {
          this.setAnswerForRetake(ans);
        } else {
          this.answer = Array.isArray(ans.value) ? ans.value.map((a: any) => a.text).join(', ').trim() : ans.value;
        }
        this.grade = ans ? ans.grade || this.grade : this.grade;
      }
    });
  }

  getSurvey(surveyId: string) {
    this.couchService.get('exams/' + surveyId).subscribe((survey) => {
      this.setTakingExam(survey, survey._id, 'survey', survey.name);
    });
  }

  setAnswer(event, option) {
    this.answer = this.answer === undefined ? [] : this.answer;
    if (event.checked === true) {
      this.answer.push(option);
    } else if (event.checked === false) {
      this.answer.splice(this.answer.indexOf(option), 1);
    }
    this.checkboxState[option.id] = event.checked;
  }

  calculateCorrect() {
    const answers = this.answer instanceof Array ? this.answer : [ this.answer ];
    return this.question.correctChoice instanceof Array ?
      this.isMultiCorrect(this.question.correctChoice, answers) :
      answers[0].id === this.question.correctChoice;
  }

  createAnswerObservable(close) {
    switch (this.mode) {
      case 'take':
        const correctAnswer = this.question.correctChoice.length > 0 ? this.calculateCorrect() : undefined;
        this.resetCheckboxes();
        return {
          obs: this.submissionsService.submitAnswer(this.answer, correctAnswer, this.questionNum - 1, correctAnswer !== false && close),
          correctAnswer
        };
      case 'grade':
        return { obs: this.submissionsService.submitGrade(this.grade, this.questionNum - 1, close), correctAnswer };
      default:
        return { obs: of({}), correctAnswer };
    }
  }

  setAnswerForRetake(answer: any) {
    switch (this.question.type) {
      case 'selectMultiple':
        this.setSelectMultipleAnswer(answer.value);
        break;
      case 'select':
        this.answer = this.question.choices.find((choice) => choice.text === answer.value.text);
        break;
      default:
        this.answer = answer.value;
    }
  }

  setSelectMultipleAnswer(answers: any[]) {
    answers.forEach(answer => {
      this.setAnswer({ checked: true }, answer);
    });
  }

}
