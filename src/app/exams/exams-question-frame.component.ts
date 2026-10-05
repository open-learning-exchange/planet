import { Component, EventEmitter, Input, OnChanges, OnInit, Optional, Output, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { PlanetLoadingSpinnerComponent } from '../shared/ui/planet-loading-spinner.component';
import { formatElapsedDuration } from './exams-take/exam-timer.helpers';

@Component({
  selector: 'planet-exams-question-frame',
  templateUrl: './exams-question-frame.component.html',
  styleUrls: ['./exams-question-frame.component.scss'],
  imports: [NgClass, MatToolbar, MatIconButton, MatIcon, PlanetLoadingSpinnerComponent]
})
export class ExamsQuestionFrameComponent implements OnInit, OnChanges {
  @Input() title = '';
  @Input() questionNum = 1;
  @Input() maxQuestions = 0;
  @Input() isLoading = false;
  @Input() isDialog = false;
  @Input() disablePrevious = false;
  @Input() disableNext = false;
  @Input() slideDirection: 'right' | 'left' = 'right';
  @Input() slideAnimationVariant: 'a' | 'b' = 'a';
  @Input() elapsedSeconds: number | null = null;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  isTimerHidden = false;

  constructor(@Optional() private scrollable: CdkScrollable | null) {}

  ngOnInit() {
    try {
      this.isTimerHidden = localStorage.getItem('planet_exam_timer_hidden') === 'true';
    } catch {
      this.isTimerHidden = false;
    }
  }

  toggleTimer() {
    this.isTimerHidden = !this.isTimerHidden;
    try {
      localStorage.setItem('planet_exam_timer_hidden', String(this.isTimerHidden));
    } catch {
      // Storage unavailable or disabled
    }
  }

  get formattedElapsedTime(): string {
    return formatElapsedDuration(this.elapsedSeconds);
  }

  get timerTooltip(): string {
    return this.isTimerHidden ? $localize`Click to show timer` : $localize`Click to hide timer`;
  }

  get timerAriaLabel(): string {
    return this.isTimerHidden
      ? $localize`Elapsed timer hidden. Click to show.`
      : $localize`Elapsed time: ${this.formattedElapsedTime}. Click to hide.`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.questionNum) {
      this.scrollToTop();
    }
  }

  get progressPercent() {
    return this.maxQuestions ? Math.round((this.questionNum / this.maxQuestions) * 100) : 0;
  }

  get slideClass() {
    return this.slideDirection === 'right'
      ? (this.slideAnimationVariant === 'a' ? 'slide-in-right-a' : 'slide-in-right-b')
      : (this.slideAnimationVariant === 'a' ? 'slide-in-left-a' : 'slide-in-left-b');
  }

  // The frame grows with its question, so the sidenav or dialog content holding it is what scrolls
  private scrollToTop() {
    setTimeout(() => this.scrollable?.scrollTo({ top: 0 }));
  }
}
