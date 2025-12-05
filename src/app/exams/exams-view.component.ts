import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { CoursesService } from '../courses/courses.service';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CouchService } from '../shared/couchdb.service';
import { Exam, ExamQuestion } from './exams.model';
import { PlanetMessageService } from '../shared/planet-message.service';
import {
  DialogsAnnouncementComponent, includedCodes, challengeCourseId, challengePeriod
} from '../shared/dialogs/dialogs-announcement.component';
import { StateService } from '../shared/state.service';

type ExamAnswerOption = { id: string; text: string; isOther?: boolean };
type ExamOtherAnswerOption = { id: 'other'; text: string; isOther: true };
type ExamAnswerValue = string | ExamAnswerOption | ExamAnswerOption[] | null;
type ExamMode = 'take' | 'grade' | 'view';

interface SubmissionAnswer {
  value?: ExamAnswerValue;
  grade?: number;
  gradeComment?: string;
  passed?: boolean;
  mistakes?: number;
}

@Component({
  selector: 'planet-exams-view',
  templateUrl: './exams-view.component.html',
  styleUrls: [ './exams-view.scss' ]
})
export class ExamsViewComponent implements OnInit, OnDestroy {

  @Input() isDialog = false;
  @Input() exam: Exam;
  @Input() submission: any;
  @Input() mode: ExamMode = 'take';
  @Input() questionNum = 0;
  @Input() previewExamType: any;
  previewMode = false;
  onDestroy$ = new Subject<void>();
  question: ExamQuestion;
  stepNum = 0;
  maxQuestions = 0;
  answer: FormControl<ExamAnswerValue>;
  statusMessage = '';
  spinnerOn = true;
  title = '';
  grade: number | undefined;
  submissionId: string;
  submittedBy = '';
  updatedOn = '';
  fromSubmission = false;
  examType = this.route.snapshot.data.mySurveys === true || this.route.snapshot.paramMap.has('surveyId') ? 'survey' : 'exam';
  checkboxState: Record<string, boolean> = {};
  isNewQuestion = true;
  unansweredQuestions: number[] = [];
  isComplete = false;
  comment: string | undefined;
  initialLoad = true;
  isLoading = true;
  courseId: string;
  teamId = this.route.snapshot.params.teamId || null;
  currentOtherOption: ExamOtherAnswerOption = { id: 'other', text: '', isOther: true };

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
    private formBuilder: FormBuilder,
  ) {
    this.answer = this.formBuilder.control<ExamAnswerValue>(null, { validators: this.answerValidator });
  }

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

  setExam(params: ParamMap) {
    this.stepNum = +params.get('stepNum');
    this.examType = params.get('type') || this.examType;
    const courseId = params.get('id');
    const submissionId = params.get('submissionId');
    const mode = this.parseMode(params.get('mode'));
    this.mode = mode ?? this.mode;
    this.answer.setValue(null);
    this.currentOtherOption = { id: 'other', text: '', isOther: true };
    this.spinnerOn = true;
    if (courseId) {
      this.coursesService.requestCourse({ courseId });
      this.statusMessage = '';
      this.grade = 0;
    } else if (submissionId) {
      this.fromSubmission = true;
      this.mode = mode ?? 'grade';
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
      this.currentOtherOption = { id: 'other', text: '', isOther: true };
    }
    this.isNewQuestion = true;
    this.spinnerOn = false;
  }

  examComplete() {
    if (this.route.snapshot.data.newUser === true) {
      this.router.navigate(
        [ '/users/submission', { id: this.submissionId } ],
        { queryParams: { teamId: this.teamId },
          state: { title: this.title} }
      );
    } else {
      this.goBack();
    }
  }

  goBack() {
    const surveyid = this.route.snapshot.params['surveyid'];
    this.isLoading = false;
    this.router.navigate([ this.route.snapshot.params.snap ? '../../' : '../',
      this.mode === 'take' ? {} :
      { type: this.mode === 'grade' ? 'exam' : 'survey', ...(surveyid ? { surveyid } : {}) }
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

  setQuestion(questions: ExamQuestion[]) {
    this.question = questions[this.questionNum - 1];
    this.maxQuestions = questions.length;
    this.answer.markAsUntouched();
    this.currentOtherOption = { id: 'other', text: '', isOther: true };
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
      const questions = submission.parent.questions || [];
      this.unansweredQuestions = questions.reduce((unanswered, q, index) => [
        ...unanswered, ...((submission.answers[index] && submission.answers[index].passed) ? [] : [ index + 1 ])
      ], []);
      this.submissionId = submission._id;
      const ans: SubmissionAnswer = submission.answers[this.questionNum - 1] || {};
      if (this.fromSubmission === true) {
        this.examType = submission.parent.type === 'surveys' ? 'survey' : 'exam';
        this.title = submission.parent.name;
        this.setQuestion(questions);
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

  setAnswer(event: { checked: boolean }, option: ExamAnswerOption) {
    const value = Array.isArray(this.answer.value) ? [ ...this.answer.value ] : [];
    if (event.checked) {
      if (!value.some(val => val.id === option.id)) {
        value.push(option);
      } else if (option.id === 'other') {
        const otherIndex = value.findIndex(val => val.id === 'other');
        if (otherIndex > -1) {
          value[otherIndex].text = option.text;
        }
      }
    } else {
      const index = value.findIndex(val => val.id === option.id);
      if (index > -1) {
        value.splice(index, 1);
      }
    }

    this.answer.setValue(value.length > 0 ? value : null);
    this.answer.updateValueAndValidity();
    this.checkboxState[option.id] = event.checked;
  }

  setRatingScaleAnswer(number: number) {
    this.answer.setValue(number.toString());
    this.answer.updateValueAndValidity();
  }

  calculateCorrect() {
    const value = this.answer.value;
    const answers = Array.isArray(value) ? value : [ value ];
    if (answers.every(answer => answer === null || answer === undefined)) {
      return undefined;
    }
    const answerOptions = answers.filter((answer): answer is ExamAnswerOption =>
      !!answer && typeof answer === 'object' && 'id' in answer && typeof answer.id === 'string'
    );
    if (answerOptions.length === 0) {
      return undefined;
    }
    const isMultiCorrect = (correctChoice: string[], ans: ExamAnswerOption[]) => (
      correctChoice.every(choice => ans.find((a: ExamAnswerOption) => a.id === choice)) &&
      ans.every((a: ExamAnswerOption) => correctChoice.find(choice => a.id === choice))
    );
    return this.question.correctChoice instanceof Array ?
      isMultiCorrect(this.question.correctChoice, answerOptions) :
      answerOptions[0].id === this.question.correctChoice;
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
        return { obs: of({ nextQuestion: this.questionNum }) };
    }
  }

  setAnswerForRetake(answer: SubmissionAnswer) {
    const setSelectMultipleAnswer = (answers: ExamAnswerOption[]) => {
      answers.forEach(ans => {
        this.setAnswer({ checked: true }, ans);
      });
    };
    this.answer.setValue(null);
    if (!answer.value) {
      return;
    }
    if (this.question.type === 'selectMultiple' && Array.isArray(answer.value)) {
      const rebuilt = answer.value.map(val => {
        if (val.id === 'other') {
          const baseOtherOption: ExamOtherAnswerOption = this.currentOtherOption || { id: 'other', text: '', isOther: true };
          this.currentOtherOption = { ...baseOtherOption, text: val.text || '' } as ExamOtherAnswerOption;
          return this.currentOtherOption;
        }
        return val;
      });
      setSelectMultipleAnswer(rebuilt);
      return;
    }
    const answerValue = answer.value;
    if (this.question.type === 'select' && this.isAnswerOption(answerValue)) {
      if (answerValue.id === 'other') {
        const baseOtherOption: ExamOtherAnswerOption = this.currentOtherOption || { id: 'other', text: '', isOther: true };
        this.currentOtherOption = { ...baseOtherOption, text: answerValue.text || '' } as ExamOtherAnswerOption;
        this.answer.setValue(this.currentOtherOption);
      } else {
        this.answer.setValue(this.question.choices.find((choice) => choice.id === answerValue.id) || null);
      }
      return;
    }
    this.answer.setValue(answerValue);
  }

  answerValidator = (ac: AbstractControl<ExamAnswerValue>): ValidationErrors | null => {
    if (typeof ac.value === 'string') {
      return ac.value.trim() ? null : { required: true };
    }

    if (Array.isArray(ac.value)) {
      if (ac.value.length === 0) {
        return { required: true };
      }
      const hasEmptyOther = ac.value.some(option =>
        option && option.isOther && (!option.text || !option.text.trim())
      );
      return hasEmptyOther ? { required: true } : null;
    }
    if (ac.value && typeof ac.value === 'object' && 'isOther' in ac.value && ac.value.isOther && (!ac.value.text || !ac.value.text.trim())) {
      return { required: true };
    }

    return ac.value !== null && ac.value !== undefined ? null : { required: true };
  };

  setViewAnswerText(answer?: SubmissionAnswer) {
    this.answer.setValue(
      Array.isArray(answer?.value) ? answer.value.map((a: ExamAnswerOption) => a.text).join(', ').trim() : answer?.value || null
    );
    this.grade = answer?.grade;
    this.comment = answer?.gradeComment;
  }

  isOtherSelected() {
    return !!this.answer.value && typeof this.answer.value === 'object' && !Array.isArray(this.answer.value) && this.answer.value.id === 'other';
  }

  toggleOtherMultiple({ checked }: { checked: boolean }): void {
    this.checkboxState['other'] = checked;
    if (checked && this.currentOtherOption) {
      this.setAnswer({ checked: true }, this.currentOtherOption);
    } else {
      const remaining = Array.isArray(this.answer.value) ? this.answer.value.filter(o => o.id !== 'other') : [];
      this.answer.setValue(remaining.length ? remaining : null);
      this.answer.updateValueAndValidity();
    }
  }

  updateOtherText(): void {
    this.answer.updateValueAndValidity();
  }

  private parseMode(mode: string | null): ExamMode | null {
    if (mode === 'grade' || mode === 'view' || mode === 'take') {
      return mode;
    }
    return null;
  }

  private isAnswerOption(value: ExamAnswerValue): value is ExamAnswerOption {
    return !!value && typeof value === 'object' && !Array.isArray(value) && 'id' in value && 'text' in value;
  }

}
