import { Component, EventEmitter, Input, OnChanges, Optional, Output, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';

@Component({
  selector: 'planet-exams-question-frame',
  templateUrl: './exams-question-frame.component.html',
  styleUrls: ['./exams-question-frame.component.scss'],
  imports: [NgClass, MatToolbar, MatIconButton, MatIcon, PlanetLoadingSpinnerComponent]
})
export class ExamsQuestionFrameComponent implements OnChanges {
  @Input() title = '';
  @Input() questionNum = 1;
  @Input() maxQuestions = 0;
  @Input() isLoading = false;
  @Input() isDialog = false;
  @Input() disablePrevious = false;
  @Input() disableNext = false;
  @Input() slideDirection: 'right' | 'left' = 'right';
  @Input() slideAnimationVariant: 'a' | 'b' = 'a';

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  constructor(@Optional() private scrollable: CdkScrollable | null) {}

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
