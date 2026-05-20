import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
    NgIf, MatIcon, TdMarkdownComponent, ExamsTakeFrameComponent, ExamsTakeWidgetComponent, MatButton, ReactiveFormsModule
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
  readonly answer = new FormControl<ExamAnswerValue>(null, { validators: examAnswerValidator });

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
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.publicSurveysService.getSurvey(params.get('teamId') || '', params.get('surveyId') || ''))
    ).subscribe({
      next: ({ survey }) => {
        this.survey = survey;
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
    this.questionNum = this.questionNum + direction;
    this.currentAnswer = this.answers[this.questionNum - 1]?.value ?? null;
  }

  submitSurvey() {
    if (!this.survey || !this.isComplete || this.isSubmitting) {
      return;
    }
    this.persistCurrentAnswer();
    this.isSubmitting = true;
    const teamId = this.route.snapshot.paramMap.get('teamId') || '';
    const surveyId = this.route.snapshot.paramMap.get('surveyId') || '';
    const answers = this.snapshotAnswers().map(storedAnswer => storedAnswer.value || null);
    this.publicSurveysService.submitSurvey(teamId, surveyId, answers).subscribe({
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
    return Array.from({ length: this.maxQuestions }, (_, index) => (
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
}
