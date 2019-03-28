import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoursesService } from '../courses/courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CouchService } from '../shared/couchdb.service';
import { FormControl, AbstractControl } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';

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
  answer = new FormControl(null, this.answerValidator);
  incorrectAnswer = false;
  spinnerOn = true;
  mode = 'take';
  title = '';
  grade;
  submissionId: string;
  submittedBy = '';
  updatedOn = '';
  fromSubmission = false;
  examType = this.route.snapshot.data.mySurveys === true || this.route.snapshot.paramMap.has('surveyId') ? 'surveys' : 'courses';
  checkboxState: any = {};
  isNewQuestion = true;
  answerCount = 0;

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
      this.answer.setValue(null);
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

  nextQuestion(nextClicked: boolean = false) {
    const { correctAnswer, obs }: { correctAnswer: boolean | undefined, obs: any } = this.createAnswerObservable();
    // Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.subscribe(({ nextQuestion }) => {
      if (correctAnswer === false) {
        this.incorrectAnswer = true;
        this.answer.setValue(null);
        this.spinnerOn = false;
      } else {
        this.routeToNext(nextClicked ? this.questionNum : nextQuestion);
      }
    });
  }

  routeToNext (nextQuestion) {
    if (nextQuestion === -1 || nextQuestion > (this.maxQuestions - 1)) {
      this.examComplete();
    } else {
      this.moveQuestion(nextQuestion - this.questionNum + 1);
    }
  }

  moveQuestion(direction: number) {
    this.router.navigate([ { ...this.route.snapshot.params, questionNum: this.questionNum + direction } ], { relativeTo: this.route });
    this.isNewQuestion = true;
    this.spinnerOn = false;
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
    this.isNewQuestion = true;
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
      this.submittedBy = this.submissionsService.submissionName(submission.user);
      this.updatedOn = submission.lastUpdateTime;
      this.answerCount = this.submissionsService.submission.answers.length;
      this.submissionId = submission._id;
      const ans = submission.answers[this.questionNum - 1] || {};
      if (this.fromSubmission === true) {
        this.examType = submission.parent.type;
        this.title = submission.parent.name;
        this.setQuestion(submission.parent.questions);
        this.grade = ans ? ans.grade || this.grade : this.grade;
      }
      if (this.mode === 'take' && this.isNewQuestion) {
        this.setAnswerForRetake(ans);
      } else if (this.mode !== 'take') {
        this.answer.setValue(Array.isArray(ans.value) ? ans.value.map((a: any) => a.text).join(', ').trim() : ans.value);
      }
      this.isNewQuestion = false;
    });
  }

  getSurvey(surveyId: string) {
    this.couchService.get('exams/' + surveyId).subscribe((survey) => {
      this.setTakingExam(survey, survey._id, 'survey', survey.name);
    });
  }

  setAnswer(event, option) {
    this.answer.setValue(this.answer.value === null ? [] : this.answer.value);
    const value = this.answer.value;
    if (event.checked === true) {
      value.push(option);
    } else if (event.checked === false) {
      value.splice(value.indexOf(option), 1);
    }
    this.checkboxState[option.id] = event.checked;
  }

  calculateCorrect() {
    const value = this.answer.value;
    const answers = value instanceof Array ? value : [ value ];
    const isMultiCorrect = (correctChoice, ans: any[]) => (
      correctChoice.every(choice => ans.find((a: any) => a.id === choice)) &&
      ans.every((a: any) => correctChoice.find(choice => a.id === choice))
    );
    return this.question.correctChoice instanceof Array ?
      isMultiCorrect(this.question.correctChoice, answers) :
      answers[0].id === this.question.correctChoice;
  }

  createAnswerObservable() {
    switch (this.mode) {
      case 'take':
        const correctAnswer = this.question.correctChoice.length > 0 ? this.calculateCorrect() : undefined;
        this.resetCheckboxes();
        return {
          obs: this.submissionsService.submitAnswer(this.answer.value, correctAnswer, this.questionNum - 1),
          correctAnswer
        };
      case 'grade':
        return { obs: this.submissionsService.submitGrade(this.grade, this.questionNum - 1), correctAnswer };
      default:
        return { obs: of({ nextQuestion: this.questionNum + 1 }), correctAnswer };
    }
  }

  setAnswerForRetake(answer: any) {
    this.answer.setValue(null);
    if (!answer.value) {
      return;
    }
    switch (this.question.type) {
      case 'selectMultiple':
        this.setSelectMultipleAnswer(answer.value);
        break;
      case 'select':
        this.answer.setValue(this.question.choices.find((choice) => choice.text === answer.value.text));
        break;
      default:
        this.answer.setValue(answer.value);
    }
  }

  setSelectMultipleAnswer(answers: any[]) {
    answers.forEach(answer => {
      this.setAnswer({ checked: true }, answer);
    });
  }

  answerValidator(ac: AbstractControl) {
    if (typeof ac.value === 'string') {
      return CustomValidators.required(ac);
    }
    return ac.value !== null ? null : { required: true };
  }

}
