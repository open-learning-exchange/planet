import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgClass } from '@angular/common';
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
export class ExamsQuestionFrameComponent {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLElement>;

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

  get progressPercent() {
    return this.maxQuestions ? Math.round((this.questionNum / this.maxQuestions) * 100) : 0;
  }

  get slideClass() {
    return this.slideDirection === 'right'
      ? (this.slideAnimationVariant === 'a' ? 'slide-in-right-a' : 'slide-in-right-b')
      : (this.slideAnimationVariant === 'a' ? 'slide-in-left-a' : 'slide-in-left-b');
  }

  scrollToTop() {
    setTimeout(() => this.scrollContainer?.nativeElement.scrollTo({ top: 0 }));
  }
}
