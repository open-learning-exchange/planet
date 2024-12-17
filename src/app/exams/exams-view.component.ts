import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CoursesService } from '../courses/courses.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CouchService } from '../shared/couchdb.service';
import { FormControl, AbstractControl } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { Exam, ExamQuestion } from './exams.model';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsAnnouncementComponent, includedCodes, challengeCourseId, challengePeriod } from '../shared/dialogs/dialogs-announcement.component';
import { StateService } from '../shared/state.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'planet-exams-view',
  templateUrl: './exams-view.component.html',
  styleUrls: [ './exams-view.scss' ]
})

export class ExamsViewComponent implements OnInit, OnDestroy {

  @Input() isDialog = false;
  @Input() exam: Exam;
  @Input() submission: any;
  @Input() mode: 'take' | 'grade' | 'view' = 'take';
  previewMode = false;
  onDestroy$ = new Subject<void>();
  question: ExamQuestion;
  @Input() questionNum = 0;
  stepNum = 0;
  maxQuestions = 0;
  answer = new FormControl(null, this.answerValidator);
  statusMessage = '';
  spinnerOn = true;
  title = '';
  grade;
  submissionId: string;
  submittedBy = '';
  updatedOn = '';
  fromSubmission = false;
  examType = this.route.snapshot.data.mySurveys === true || this.route.snapshot.paramMap.has('surveyId') ? 'survey' : 'exam';
  @Input() previewExamType: any;
  checkboxState: any = {};
  isNewQuestion = true;
  unansweredQuestions: number[];
  isComplete = false;
  comment: string;
  initialLoad = true;
  isLoading = true;
  courseId: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private stateService: StateService,
  ) { }

  ngOnInit() {
    this.setCourseListener();
    this.setSubmissionListener();
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.previewMode = params.get('preview') === 'true' || this.isDialog;
      this.questionNum = +params.get('questionNum') || this.questionNum;
      if (this.previewMode) {
        ((this.exam || this.submission) ? of({}) : this.couchService.get(`exams/${params.get('examId')}`)).subscribe(
          (res) => {
            this.exam = this.exam || res;
            this.examType = params.get('type') || this.previewExamType;
            this.setExamPreview();
          },
          (err) => {
            this.planetMessageService.showAlert($localize`Preview is not available for this test`);
            this.goBack();
          }
        );
        return;
      }
      this.setExam(params);
      this.courseId = params.get('id');
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setExam(params) {
    this.stepNum = +params.get('stepNum');
    this.examType = params.get('type') || this.examType;
    const courseId = params.get('id');
    const submissionId = params.get('submissionId');
    const mode = params.get('mode');
    this.mode = mode || this.mode;
    this.answer.setValue(null);
    this.spinnerOn = true;
    if (courseId) {
      this.coursesService.requestCourse({ courseId });
      this.statusMessage = '';
      this.grade = 0;
    } else if (submissionId) {
      this.fromSubmission = true;
      this.mode = mode || 'grade';
      this.grade = mode === 'take' ? 0 : undefined;
      this.comment = undefined;
      this.submissionsService.openSubmission({ submissionId, 'status': params.get('status') });
    }
  }

  setExamPreview() {
    this.answer.setValue(null);
    this.checkboxState = {};
    this.grade = 0;
    this.statusMessage = '';
    const exam = this.submission ? this.submission.parent : this.exam;
    this.setQuestion(exam.questions);
    if (this.submission) {
      this.submittedBy = this.submission.user.name;
      this.updatedOn = this.submission.lastUpdateTime;
      this.setViewAnswerText(this.submission.answers[this.questionNum - 1]);
    }
    this.isLoading = false;
  }

  nextQuestion({ nextClicked = false, isFinish = false }: { nextClicked?: boolean, isFinish?: boolean } = {}) {
    const { correctAnswer, obs }: { correctAnswer?: boolean | undefined, obs: any } = this.createAnswerObservable(isFinish);
    const previousStatus = this.previewMode ? 'preview' : this.submissionsService.submission.status;
// Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.subscribe(({ nextQuestion }) => {
      if (correctAnswer === false) {
        this.statusMessage = 'incorrect';
        this.answer.setValue(null);
        this.question.choices.forEach(choice => this.checkboxState[choice.id] = false);
        this.spinnerOn = false;
      } else {
        this.routeToNext(nextQuestion, previousStatus);
        // Challenge option only
        if (
          isFinish &&
          includedCodes.includes(this.stateService.configuration.code) &&
          challengePeriod &&
          this.courseId === challengeCourseId
          ) {
          this.dialog.open(DialogsAnnouncementComponent, {
            width: '50vw',
            maxHeight: '100vh'
          });
        }
      }
    });
  }

  routeToNext(nextQuestion, previousStatus) {
    this.statusMessage = this.isComplete && this.mode === 'take' ? 'complete' : '';
    if (nextQuestion > -1 && nextQuestion < this.maxQuestions) {
      this.moveQuestion(nextQuestion - this.questionNum + 1);
      return;
    }
    if (this.isDialog) {
      this.spinnerOn = false;
      return;
    }
    this.examComplete();
    if (this.examType === 'survey' && !this.previewMode) {
      this.submissionsService.sendSubmissionNotification(this.route.snapshot.data.newUser, previousStatus === 'complete');
    }
  }

  moveQuestion(direction: number) {
    if (this.isDialog) {
      this.questionNum = this.questionNum + direction;
      this.setExamPreview();
      this.spinnerOn = false;
      return;
    }
    this.router.navigate([ { ...this.route.snapshot.params, questionNum: this.questionNum + direction } ], { relativeTo: this.route });
    if (direction !== 0) {
      this.checkboxState = {};
    }
    this.isNewQuestion = true;
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
    this.isLoading = false;
    this.router.navigate([ '../',
      this.mode === 'take' ? {} :
      { type: this.mode === 'grade' ? 'exam' : 'survey' }
    ], { relativeTo: this.route });
    this.isNewQuestion = true;
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
    this.answer.markAsUntouched();
  }

  setCourseListener() {
    this.coursesService.courseUpdated$.pipe(
      takeUntil(this.onDestroy$),
      switchMap(({ course, progress }: { course: any, progress: any }) => {
        // To be readable by non-technical people stepNum & questionNum param will start at 1
        const step = course.steps[this.stepNum - 1];
        this.title = step.stepTitle;
        return forkJoin([ of(course), of(step), this.couchService.get(`exams/${step[this.examType]._id}`).pipe(catchError(() => of(0))) ]);
      })
    ).subscribe(([ course, step, exam ]: any[]) => {
      const type = this.examType;
      const takingExam = exam ? exam : step[type];
      this.setTakingExam(takingExam, takingExam._id + '@' + course._id, type);
      this.isLoading = false;
    });
  }

  setSubmissionListener() {
    this.submissionsService.submissionUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ submission }) => {
      this.submittedBy = this.submissionsService.submissionName(submission.user);
      this.updatedOn = submission.lastUpdateTime;
      this.unansweredQuestions = submission.parent.questions.reduce((unanswered, q, index) => [
        ...unanswered, ...((submission.answers[index] && submission.answers[index].passed) ? [] : [ index + 1 ])
      ], []);
      this.submissionId = submission._id;
      const ans = submission.answers[this.questionNum - 1] || {};
      if (this.fromSubmission === true) {
        this.examType = submission.parent.type === 'surveys' ? 'survey' : 'exam';
        this.title = submission.parent.name;
        this.setQuestion(submission.parent.questions);
        this.grade = (ans && ans.grade !== undefined) ? ans.grade : this.grade;
        this.comment = ans && ans.gradeComment;
      }
      if (this.initialLoad && this.mode === 'take' && this.unansweredQuestions.length > 0) {
        const nextUnansweredQuestion = this.unansweredQuestions[0];
        if (this.questionNum !== nextUnansweredQuestion) {
          this.questionNum = nextUnansweredQuestion;
          this.router.navigate([ {
            ...this.route.snapshot.params,
            questionNum: this.questionNum
          } ], { relativeTo: this.route });
        }
        this.initialLoad = false;
      }
      if (this.mode === 'take' && this.isNewQuestion) {
        this.setAnswerForRetake(ans);
      } else if (this.mode !== 'take') {
        this.setViewAnswerText(ans);
      }
      this.isNewQuestion = false;
      this.isComplete = this.unansweredQuestions && this.unansweredQuestions.every(number => this.questionNum === number);
      this.isLoading = false;
  });
}

  setAnswer(event, option) {
    const value = this.answer.value || [];


    if (event.checked) {
      if (!value.includes(option)) {
        value.push(option);
      }
    } else {
      const index = value.indexOf(option);
      if (index > -1) {
        value.splice(index, 1);
      }
    }

    this.answer.setValue(value);
    this.answer.updateValueAndValidity();
    this.checkboxState[option.id] = event.checked;
  }

  calculateCorrect() {
    const value = this.answer.value;
    const answers = value instanceof Array ? value : [ value ];
    if (answers.every(answer => answer === null || answer === undefined)) {
      return undefined;
    }
    const isMultiCorrect = (correctChoice, ans: any[]) => (
      correctChoice.every(choice => ans.find((a: any) => a.id === choice)) &&
      ans.every((a: any) => correctChoice.find(choice => a.id === choice))
    );
    return this.question.correctChoice instanceof Array ?
      isMultiCorrect(this.question.correctChoice, answers) :
      answers[0].id === this.question.correctChoice;
  }

  createAnswerObservable(isFinish = false) {
    switch (this.mode) {
      case 'take':
        const correctAnswer = this.question.correctChoice.length > 0 ? this.calculateCorrect() : undefined;
        const obs = this.previewMode ?
          of({ nextQuestion: this.questionNum }) :
          this.submissionsService.submitAnswer(this.answer.value, correctAnswer, this.questionNum - 1, isFinish);
        return { obs, correctAnswer };
      case 'grade':
        return { obs: this.submissionsService.submitGrade(this.grade, this.questionNum - 1, this.comment) };
      default:
        return { obs: of({ nextQuestion: this.questionNum + 1 }) };
    }
  }

  setAnswerForRetake(answer: any) {
    const setSelectMultipleAnswer = (answers: any[]) => {
      answers.forEach(ans => {
        this.setAnswer({ checked: true }, ans);
      });
    };
    this.answer.setValue(null);
    if (!answer.value) {
      return;
    }
    switch (this.question.type) {
      case 'selectMultiple':
        setSelectMultipleAnswer(answer.value);
        break;
      case 'select':
        this.answer.setValue(this.question.choices.find((choice) => choice.text === answer.value.text));
        break;
      default:
        this.answer.setValue(answer.value);
    }
  }

  answerValidator(ac: AbstractControl) {
    if (typeof ac.value === 'string') {
      return ac.value.trim() ? null : { required: true };
    }

    if (Array.isArray(ac.value)) {
      return ac.value.length > 0 ? null : { required: true };
    }

    return ac.value !== null && ac.value !== undefined ? null : { required: true };
  }

  setViewAnswerText(answer: any) {
    this.answer.setValue(Array.isArray(answer.value) ? answer.value.map((a: any) => a.text).join(', ').trim() : answer.value);
    this.grade = answer.grade;
    this.comment = answer.gradeComment;
  }

}
