import { Component, OnInit } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TdMarkdownComponent } from '@covalent/markdown';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';

import { ExamsQuestionFrameComponent } from '../exams-question-frame.component';
import { ExamsTakeWidgetComponent } from '../exams-take/exams-take-widget.component';
import { StoredExamAnswer, ExamAnswerValue, examAnswerValidator } from '../exams-take/exam-answer.helpers';
import { PublicSurvey, PublicSurveyDemographics, PublicSurveysService } from './public-surveys.service';
import { LoginDialogComponent } from '../../login/login-dialog.component';

@Component({
  selector: 'planet-public-survey',
  templateUrl: './public-survey.component.html',
  styleUrls: ['./public-survey.component.scss'],
  imports: [
    MatIcon, TdMarkdownComponent, ExamsQuestionFrameComponent, ExamsTakeWidgetComponent, MatButton,
    ReactiveFormsModule, MatFormField, MatLabel, MatHint, MatError, MatInput, MatRadioGroup, MatRadioButton
  ]
})
export class PublicSurveyComponent implements OnInit {
  survey: PublicSurvey | null = null;
  errorMessage = '';
  questionNum = 1;
  answers: StoredExamAnswer[] = [];
  currentAnswer: ExamAnswerValue | null = null;
  isLoading = true;
  isSubmitting = false;
  isSubmitted = false;
  showDemographics = false;
  readonly answer = new FormControl<ExamAnswerValue>(null, { validators: examAnswerValidator });
  readonly demographicsForm = this.fb.group({
    birthYear: this.fb.control<number | null>(null, [
      Validators.min(1900),
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
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.publicSurveysService.getSurvey(params.get('teamId') || '', params.get('surveyId') || ''))
    ).subscribe({
      next: ({ survey }) => {
        this.survey = survey;
        this.errorMessage = '';
        this.questionNum = 1;
        this.answers = Array.from({ length: survey.questions.length }, () => ({ value: null, valid: false }));
        this.currentAnswer = this.answers[0]?.value ?? null;
        this.answer.reset();
        this.demographicsForm.reset();
        this.showDemographics = false;
        this.isSubmitted = false;
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
    if (direction === 1 && this.questionNum === this.maxQuestions) {
      this.currentAnswer = this.answers[this.questionNum - 1]?.value ?? null;
      this.showDemographics = true;
      return;
    }
    this.questionNum = this.questionNum + direction;
    this.currentAnswer = this.answers[this.questionNum - 1]?.value ?? null;
  }

  submitSurvey() {
    if (!this.survey || !this.showDemographics || !this.canSubmit()) {
      return;
    }
    this.isSubmitting = true;
    const teamId = this.route.snapshot.paramMap.get('teamId') || '';
    const surveyId = this.route.snapshot.paramMap.get('surveyId') || '';
    const answers = this.snapshotAnswers().map(storedAnswer => storedAnswer.value || null);
    const user = this.getDemographics();
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
    return this.isComplete && this.demographicsForm.valid && !this.isSubmitting;
  }

  private getDemographics(): PublicSurveyDemographics | undefined {
    const { birthYear, gender } = this.demographicsForm.getRawValue();
    const user: PublicSurveyDemographics = {};

    if (birthYear !== null) {
      user.age = new Date().getFullYear() - birthYear;
    }
    if (gender) {
      user.gender = gender;
    }

    return Object.keys(user).length > 0 ? user : undefined;
  }
}
