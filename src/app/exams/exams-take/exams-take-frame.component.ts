import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';

@Component({
  selector: 'planet-exams-take-frame',
  templateUrl: './exams-take-frame.component.html',
  styleUrls: ['./exams-take-frame.component.scss'],
  imports: [NgClass, NgIf, MatToolbar, MatIconButton, MatIcon, PlanetLoadingSpinnerComponent]
})
export class ExamsTakeFrameComponent {
  @Input() title = '';
  @Input() questionNum = 1;
  @Input() maxQuestions = 0;
  @Input() isLoading = false;
  @Input() isDialog = false;
  @Input() disablePrevious = false;
  @Input() disableNext = false;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
