import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TdMarkdownComponent } from '@covalent/markdown';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';

import { ExamTakeComponent } from '../exam-take.component';
import { StoredExamAnswer, ExamAnswerValue, examAnswerValidator } from '../exam-answer.helpers';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';
import { StateService } from '../../shared/state.service';
import { PublicSurvey, PublicSurveysService } from './public-surveys.service';

@Component({
  selector: 'planet-public-survey',
  templateUrl: './public-survey.component.html',
  styleUrls: ['./public-survey.component.scss'],
  imports: [
    NgIf, MatToolbar, RouterLink, MatIcon, MatIconButton, TdMarkdownComponent,
    ExamTakeComponent, MatButton, PlanetLoadingSpinnerComponent, ReactiveFormsModule
  ]
})
export class PublicSurveyComponent implements OnInit {
  survey: PublicSurvey | null = null;
  errorMessage = '';
  questionNum = 1;
  answers: StoredExamAnswer[] = [];
  currentAnswer: StoredExamAnswer | null = null;
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
    public stateService: StateService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => this.publicSurveysService.getSurvey(params.get('teamId') || '', params.get('surveyId') || ''))
    ).subscribe({
      next: ({ survey }) => {
        this.survey = survey;
        this.answers = Array.from({ length: survey.questions.length }, () => ({ value: null, valid: false }));
        this.currentAnswer = this.answers[0];
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
    this.currentAnswer = this.answers[this.questionNum - 1] || null;
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
}
