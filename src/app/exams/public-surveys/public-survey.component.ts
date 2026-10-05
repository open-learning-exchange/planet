import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlanetMarkdownComponent } from '../../shared/markdown/planet-markdown.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatCard } from '@angular/material/card';

import { ExamsQuestionFrameComponent } from '../exams-question-frame.component';
import { ExamsTakeWidgetComponent } from '../exams-take/exams-take-widget.component';
import { StoredExamAnswer, ExamAnswerValue, examAnswerValidator } from '../exams-take/exam-answer.helpers';
import { PublicSurvey, PublicSurveyDemographics, PublicSurveysService, PublicSurveyTeam } from './public-surveys.service';
import { LoginDialogComponent } from '../../login/login-dialog.component';
import { AndroidAppPromptService } from '../../shared/android/android-app-prompt.service';
import { PlanetLoadingSpinnerComponent } from '../../shared/ui/planet-loading-spinner.component';

type PublicSurveyStep = 'intro' | 'questions' | 'demographics' | 'submitted';

@Component({
  selector: 'planet-public-survey',
  templateUrl: './public-survey.component.html',
  styleUrls: ['./public-survey.component.scss'],
  imports: [
    MatIcon, PlanetMarkdownComponent, ExamsQuestionFrameComponent, ExamsTakeWidgetComponent, MatButton,
    ReactiveFormsModule, MatFormField, MatLabel, MatHint, MatError, MatInput, MatRadioGroup, MatRadioButton,
    PlanetLoadingSpinnerComponent, MatCard
  ]
})
export class PublicSurveyComponent implements OnInit, OnDestroy {
  survey: PublicSurvey | null = null;
  team: PublicSurveyTeam | null = null;
  errorMessage = '';
  step: PublicSurveyStep = 'intro';
  questionNum = 1;
  answers: StoredExamAnswer[] = [];
  currentAnswer: ExamAnswerValue | null = null;
  isLoading = true;
  isSubmitting = false;
  elapsedSeconds: number | null = null;
  private sessionStartTimestamp: number | null = null;
  private timerSub?: Subscription;
  private onDestroy$ = new Subject<void>();
  readonly answer = new FormControl<ExamAnswerValue>(null, { validators: examAnswerValidator });
  readonly demographicsForm = this.fb.group({
    birthYear: this.fb.control<number | null>(null, [
      Validators.min(new Date().getFullYear() - 130),
      Validators.max(new Date().getFullYear() - 1),
      Validators.pattern(/^\d{4}$/)
    ]),
    gender: this.fb.control('')
  });

  get question() {
    return this.survey?.questions[this.questionNum - 1] || null;
  }

  get maxQuestions() {
    return this.survey?.questions.length || 0;
  }

  get isComplete() {
    return this.maxQuestions > 0 && this.snapshotAnswers().every(storedAnswer => storedAnswer?.valid === true);
  }

  constructor(
    private route: ActivatedRoute,
    private publicSurveysService: PublicSurveysService,
    private fb: NonNullableFormBuilder,
    private dialog: MatDialog,
    private androidAppPromptService: AndroidAppPromptService
  ) {}

  ngOnInit() {
    this.androidAppPromptService.openIfEligible();
    this.route.paramMap.pipe(
      switchMap(params => this.publicSurveysService.getSurvey(params.get('teamId') || '', params.get('surveyId') || ''))
    ).subscribe({
      next: ({ survey, team }) => {
        this.survey = survey;
        this.team = team;
        this.errorMessage = '';
        this.step = 'intro';
        this.questionNum = 1;
        this.answers = Array.from({ length: survey.questions.length }, () => ({ value: null, valid: false }));
        this.currentAnswer = this.answers[0]?.value ?? null;
        this.answer.reset();
        this.demographicsForm.reset();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || $localize`Survey not found or not available.`;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  startSurvey() {
    this.step = 'questions';
    this.startTimer();
  }

  startTimer() {
    if (this.timerSub) {
      return;
    }
    this.sessionStartTimestamp = Date.now();
    this.elapsedSeconds = 0;
    this.timerSub = timer(1000, 1000).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      if (this.sessionStartTimestamp) {
        this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.sessionStartTimestamp) / 1000));
      }
    });
  }

  stopTimer() {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }
  }

  moveQuestion(direction: number) {
    this.persistCurrentAnswer();
    if (direction === 1 && this.questionNum === this.maxQuestions) {
      this.currentAnswer = this.answers[this.questionNum - 1]?.value ?? null;
      this.step = 'demographics';
      return;
    }
    this.questionNum = this.questionNum + direction;
    this.currentAnswer = this.answers[this.questionNum - 1]?.value ?? null;
  }

  submitSurvey() {
    if (!this.survey || this.step !== 'demographics' || !this.canSubmit()) {
      return;
    }
    this.stopTimer();
    this.isSubmitting = true;
    const teamId = this.route.snapshot.paramMap.get('teamId') || '';
    const surveyId = this.route.snapshot.paramMap.get('surveyId') || '';
    const answers = this.snapshotAnswers().map(storedAnswer => storedAnswer.value || null);
    const user = this.getDemographics();
    this.publicSurveysService.submitSurvey(teamId, surveyId, answers, user).subscribe({
      next: () => {
        this.step = 'submitted';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || $localize`There was a problem submitting this survey.`;
        this.isSubmitting = false;
      }
    });
  }

  private persistCurrentAnswer() {
    this.answers[this.questionNum - 1] = { value: this.answer.value, valid: this.answer.valid };
  }

  private snapshotAnswers() {
    return Array.from({ length: this.answers.length }, (_, index) => (
      index === this.questionNum - 1
        ? { value: this.answer.value, valid: this.answer.valid }
        : this.answers[index] || { value: null, valid: false }
    ));
  }

  openSignupDialog() {
    this.dialog.open(LoginDialogComponent, {
      data: { createMode: true }
    });
  }

  canSubmit() {
    return this.isComplete && this.demographicsForm.valid && !this.isSubmitting;
  }

  private getDemographics(): PublicSurveyDemographics {
    const { birthYear, gender } = this.demographicsForm.getRawValue();
    const user: PublicSurveyDemographics = {};

    if (birthYear !== null) {
      user.age = new Date().getFullYear() - birthYear;
    }
    if (gender) {
      user.gender = gender;
    }

    return user;
  }
}
