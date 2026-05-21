import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TdMarkdownComponent } from '@covalent/markdown';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { ExamsTakeFrameComponent } from '../exams-take/exams-take-frame.component';
import { ExamsTakeWidgetComponent } from '../exams-take/exams-take-widget.component';
import { StoredExamAnswer, ExamAnswerValue, examAnswerValidator } from '../exams-take/exam-answer.helpers';
import { PublicSurvey, PublicSurveysService } from './public-surveys.service';
import { LoginDialogComponent } from '../../login/login-dialog.component';
import { createUsersProfileForm, normalizeUsersProfileDemographicsSubmission } from '../../shared/forms/users-profile-form';
import { UsersProfileFormComponent } from '../../shared/forms/users-profile-form.component';
import { ValidatorService } from '../../validators/validator.service';

@Component({
  selector: 'planet-public-survey',
  templateUrl: './public-survey.component.html',
  styles: [`
    .state-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 10vh;
      text-align: center;
    }

    .state-message {
      max-width: 480px;
    }
  `],
  imports: [
    NgIf, MatIcon, TdMarkdownComponent, ExamsTakeFrameComponent,
    ExamsTakeWidgetComponent, MatButton, ReactiveFormsModule, UsersProfileFormComponent
  ]
})
export class PublicSurveyComponent implements OnInit {
  survey: PublicSurvey | null = null;
  errorMessage = '';
  questionNum = 1;
  totalSteps = 0;
  answers: StoredExamAnswer[] = [];
  currentAnswer: ExamAnswerValue | null = null;
  isLoading = true;
  isSubmitting = false;
  isSubmitted = false;
  readonly answer = new FormControl<ExamAnswerValue>(null, { validators: examAnswerValidator });
  readonly usersProfileForm = createUsersProfileForm(this.fb, this.validatorService, true);

  get question() {
    return this.survey?.questions[this.questionNum - 1] || null;
  }

  get isProfileStep() {
    return this.questionNum === this.totalSteps;
  }

  constructor(
    private route: ActivatedRoute,
    private publicSurveysService: PublicSurveysService,
    private fb: NonNullableFormBuilder,
    private validatorService: ValidatorService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.publicSurveysService.getSurvey(params.get('teamId') || '', params.get('surveyId') || ''))
    ).subscribe({
      next: ({ survey }) => {
        this.survey = survey;
        this.totalSteps = survey.questions.length + 1;
        this.answers = Array.from({ length: survey.questions.length }, () => ({ value: null, valid: false }));
        this.currentAnswer = this.answers[0]?.value ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || $localize`Survey not found or not available.`;
        this.isLoading = false;
      }
    });
  }

  moveQuestion(direction: number) {
    this.persistCurrentAnswer();
    const nextQuestionNum = this.questionNum + direction;
    this.questionNum = nextQuestionNum;
    this.currentAnswer = nextQuestionNum === this.totalSteps ? null : this.answers[nextQuestionNum - 1]?.value ?? null;
  }

  submitSurvey() {
    if (!this.survey || !this.canSubmit()) {
      return;
    }
    this.persistCurrentAnswer();
    this.isSubmitting = true;
    const teamId = this.route.snapshot.paramMap.get('teamId') || '';
    const surveyId = this.route.snapshot.paramMap.get('surveyId') || '';
    const answers = this.snapshotAnswers().map(storedAnswer => storedAnswer.value || null);
    const user = normalizeUsersProfileDemographicsSubmission(this.usersProfileForm.getRawValue());
    this.publicSurveysService.submitSurvey(teamId, surveyId, answers, user).subscribe({
      next: () => {
        this.isSubmitted = true;
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || $localize`There was a problem submitting this survey.`;
        this.isSubmitting = false;
      }
    });
  }

  private persistCurrentAnswer() {
    if (this.isProfileStep) {
      return;
    }
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
      'data': { 'createMode': true }
    });
  }

  canSubmit() {
    return this.answers.length > 0 &&
      this.snapshotAnswers().every(storedAnswer => storedAnswer?.valid === true) &&
      !this.isSubmitting;
  }
}
