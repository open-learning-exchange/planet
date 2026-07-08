import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import {
  FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError, finalize } from 'rxjs/operators';
import { CoursesService } from '../courses/courses.service';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CouchService } from '../shared/couchdb.service';
import { Exam, ExamQuestion } from './exams.model';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ChallengesService } from '../shared/challenges/challenges.service';
import { DatePipe } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { CovalentFlavoredMarkdownModule } from '@covalent/flavored-markdown';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { PlanetMarkdownTextboxComponent } from '../shared/forms/planet-markdown-textbox.component';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { ExamsQuestionFrameComponent } from './exams-question-frame.component';
import { ExamsTakeWidgetComponent } from './exams-take/exams-take-widget.component';
import {
  ExamAnswerOption, ExamAnswerValue, isExamAnswerOption, examAnswerValidator
} from './exams-take/exam-answer.helpers';

interface ExamViewForm {
  answer: FormControl<ExamAnswerValue>;
}

@Component({
  selector: 'planet-exams-view',
  templateUrl: './exams-view.component.html',
  imports: [
    MatToolbar,
    MatIconAnchor,
    MatIcon,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    CovalentFlavoredMarkdownModule,
    MatFormField,
    MatLabel,
    FormsModule,
    ReactiveFormsModule,
    PlanetMarkdownTextboxComponent,
    MatRadioGroup,
    MatRadioButton,
    MatButton,
    DatePipe,
    ExamsQuestionFrameComponent,
    ExamsTakeWidgetComponent
  ]
})
export class ExamsViewComponent implements OnInit, OnDestroy {

  @ViewChild(ExamsQuestionFrameComponent) questionFrame?: ExamsQuestionFrameComponent;

  @Input() isDialog = false;
  @Input() exam: Exam;
  @Input() submission: any;
  @Input() mode: 'take' | 'grade' | 'view' = 'take';
  @Input() questionNum = 0;
  @Input() previewExamType: any;
  previewMode = false;
  onDestroy$ = new Subject<void>();
  question: ExamQuestion;
  stepNum = 0;
  maxQuestions = 0;
  statusMessage = '';
  title = '';
  grade;
  submissionId: string;
  submittedBy = '';
  updatedOn = '';
  fromSubmission = false;
  examType = this.route.snapshot.data.mySurveys === true || this.route.snapshot.paramMap.has('surveyId') ? 'survey' : 'exam';
  isNewQuestion = true;
  unansweredQuestions: number[];
  isComplete = false;
  comment: string;
  initialLoad = true;
  isLoading = true;
  courseId: string;
  teamId = this.route.snapshot.params.teamId || null;
  currentAnswer: ExamAnswerValue | null = null;
  slideDirection: 'right' | 'left' = 'right';
  slideAnimationVariant: 'a' | 'b' = 'a';

  readonly examForm: FormGroup<ExamViewForm>;
  get answer(): FormControl<ExamAnswerValue> {
    return this.examForm.controls.answer;
  }
  get disableFrameNext(): boolean {
    return this.isLoading ||
      this.questionNum === this.maxQuestions ||
      (!this.previewMode && this.mode !== 'view' && (!this.answer.valid || this.grade === undefined || this.grade === null));
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private dialogsLoadingService: DialogsLoadingService,
    private formBuilder: FormBuilder,
    private challengesService: ChallengesService,
  ) {
    this.examForm = this.formBuilder.group({
      answer: this.formBuilder.control<ExamAnswerValue>(null, { validators: examAnswerValidator })
    });
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

  setExam(params) {
    this.stepNum = +params.get('stepNum');
    this.examType = params.get('type') || this.examType;
    const courseId = params.get('id');
    const submissionId = params.get('submissionId');
    const mode = params.get('mode');
    this.mode = mode || this.mode;
    this.answer.setValue(null);
    this.currentAnswer = null;
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
    this.dialogsLoadingService.start();
    const { correctAnswer, obs }: { correctAnswer?: boolean | undefined, obs: any } = this.createAnswerObservable(isFinish);
    const previousStatus = this.previewMode ? 'preview' : this.submissionsService.submission.status;
    // Only navigate away from page until after successful post (ensures DB is updated for submission list)
    obs.pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe(({ nextQuestion }) => {
      if (correctAnswer === false) {
        this.statusMessage = 'incorrect';
        this.answer.setValue(null);
        this.currentAnswer = null;
      } else {
        this.routeToNext(nextQuestion, previousStatus);
        const challenge = isFinish ? this.challengesService.getActiveChallengeForCourse(this.courseId) : undefined;
        if (challenge) {
          this.challengesService.openChallengeDialog(this.dialog, challenge);
        }
      }
    });
  }

  nextFromFrame() {
    if (this.previewMode || this.mode === 'view') {
      this.moveQuestion(1);
      return;
    }
    this.dialogsLoadingService.start();
    const { correctAnswer, obs }: { correctAnswer?: boolean | undefined, obs: any } = this.createAnswerObservable();
    const previousStatus = this.submissionsService.submission.status;
    obs.pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe(({ nextQuestion }) => {
      if (correctAnswer === false) {
        this.statusMessage = 'incorrect';
        this.answer.setValue(null);
        this.currentAnswer = null;
        return;
      }
      if (this.mode === 'take' && nextQuestion === this.questionNum - 1 && this.questionNum < this.maxQuestions) {
        this.moveQuestion(1);
        return;
      }
      this.routeToNext(nextQuestion, previousStatus);
    });
  }

  routeToNext(nextQuestion, previousStatus) {
    this.statusMessage = this.isComplete && this.mode === 'take' ? 'complete' : '';
    if (nextQuestion > -1 && nextQuestion < this.maxQuestions) {
      this.moveQuestion(nextQuestion - this.questionNum + 1);
      return;
    }
    if (this.isDialog) {
      return;
    }
    this.examComplete();
    if (this.examType === 'survey' && !this.previewMode) {
      this.submissionsService.sendSubmissionNotification(this.route.snapshot.data.newUser, previousStatus === 'complete');
    }
  }

  moveQuestion(direction: number) {
    if (direction !== 0) {
      this.slideDirection = direction > 0 ? 'right' : 'left';
      this.slideAnimationVariant = this.slideAnimationVariant === 'a' ? 'b' : 'a';
      this.questionFrame?.scrollToTop();
    }
    if (this.isDialog) {
      this.questionNum = this.questionNum + direction;
      this.setExamPreview();
      return;
    }
    this.router.navigate([ { ...this.route.snapshot.params, questionNum: this.questionNum + direction } ], { relativeTo: this.route });
    this.isNewQuestion = true;
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
        const examId = this.route.snapshot.paramMap.get('examId');
        const configuredStepIndex = examId ?
          course.steps.findIndex(courseStep => courseStep[this.examType]?._id === examId) :
          -1;
        if (configuredStepIndex > -1) {
          this.stepNum = configuredStepIndex + 1;
        }
        const step = course.steps[configuredStepIndex > -1 ? configuredStepIndex : this.stepNum - 1];
        if (!step?.[this.examType]?._id) {
          this.planetMessageService.showAlert($localize`This test is not available`);
          this.goBack();
          return EMPTY;
        }
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
      const ans = submission.answers[this.questionNum - 1] || {};
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
        this.currentAnswer = ans?.value !== undefined ? ans.value : null;
      } else if (this.mode !== 'take') {
        this.setViewAnswerText(ans);
      }
      this.isNewQuestion = false;
      this.isComplete = this.unansweredQuestions && this.unansweredQuestions.every(number => this.questionNum === number);
      this.isLoading = false;
    });
  }

  calculateCorrect() {
    const value = this.answer.value;
    const answers = Array.isArray(value) ? value : isExamAnswerOption(value) ? [ value ] : [];
    const answerIds = answers
      .map(ans => typeof ans === 'string' ? ans : ans?.id)
      .filter((id): id is string => !!id);

    if (answerIds.length === 0) {
      return undefined;
    }

    const isMultiCorrect = (correctChoice: string[], ans: string[]) => (
      correctChoice.every(choice => ans.includes(choice)) &&
      ans.every(answer => correctChoice.includes(answer))
    );

    return this.question.correctChoice instanceof Array ?
      isMultiCorrect(this.question.correctChoice, answerIds) :
      answerIds[0] === this.question.correctChoice;
  }

  createAnswerObservable(isFinish = false) {
    switch (this.mode) {
      case 'take':
        const correctChoice = this.question.correctChoice || '';
        const correctAnswer = correctChoice.length > 0 ? this.calculateCorrect() : undefined;
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

  setViewAnswerText(answer: any) {
    const answerValue = answer.value as ExamAnswerValue | null;
    this.answer.setValue(Array.isArray(answerValue) ? answerValue.map((a: ExamAnswerOption) => a.text).join(', ').trim() : answerValue);
    this.grade = answer.grade;
    this.comment = answer.gradeComment;
  }

}
