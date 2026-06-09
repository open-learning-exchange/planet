import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';

import { ExamQuestion } from '../exams.model';
import {
  ExamAnswerOption, ExamAnswerValue, addCheckedAnswer, createOtherAnswerOption, isExamAnswerOption,
  isOtherAnswerOption, restoreExamAnswer
} from './exam-answer.helpers';
import { PlanetMarkdownTextboxComponent } from '../../shared/forms/planet-markdown-textbox.component';

@Component({
  selector: 'planet-exams-take-widget',
  templateUrl: './exams-take-widget.component.html',
  styleUrls: ['./exams-take-widget.component.scss'],
  imports: [
    NgSwitch, NgSwitchCase, MatFormField, MatLabel, MatInput, ReactiveFormsModule, PlanetMarkdownTextboxComponent,
    MatRadioGroup, NgFor, MatRadioButton, MatCheckbox, NgIf, FormsModule, MatButton, MatIcon
  ]
})
export class ExamsTakeWidgetComponent implements OnChanges {

  @Input() question: (ExamQuestion & { hasOtherOption?: boolean, scaleMax?: number }) | null = null;
  @Input() answer: FormControl<ExamAnswerValue>;
  @Input() examType: 'survey' | 'exam' = 'survey';
  @Input() storedAnswerValue: ExamAnswerValue | null = null;

  @ViewChild('singleOtherInput') singleOtherInput?: ElementRef<HTMLInputElement>;
  @ViewChild('multipleOtherInput') multipleOtherInput?: ElementRef<HTMLInputElement>;

  checkboxState: Record<string, boolean> = {};
  currentOtherOption = createOtherAnswerOption();

  get ratingScaleNumbers() {
    const scaleMax = this.question?.scaleMax ?? 9;
    return Array.from({ length: scaleMax }, (_, i) => i + 1);
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes.question || changes.storedAnswerValue) && this.answer) {
      const restoredAnswer = restoreExamAnswer(this.question, this.storedAnswerValue);
      this.checkboxState = restoredAnswer.checkboxState;
      this.currentOtherOption = restoredAnswer.currentOtherOption;
      this.answer.setValue(restoredAnswer.value);
      this.answer.updateValueAndValidity({ emitEvent: false });
    }
  }

  setCheckboxAnswer({ checked }: Pick<MatCheckboxChange, 'checked'>, option: ExamAnswerOption) {
    this.answer.setValue(addCheckedAnswer(this.answer.value, option, checked));
    this.answer.updateValueAndValidity();
    this.checkboxState[option.id] = checked;
  }

  setRatingScaleAnswer(number: number) {
    this.answer.setValue(number.toString());
    this.answer.updateValueAndValidity();
  }

  isOtherSelected() {
    return isOtherAnswerOption(this.answer.value);
  }

  isSelectOptionSelected(option: ExamAnswerOption): boolean {
    const value = this.answer.value;
    return isExamAnswerOption(value) && !isOtherAnswerOption(value) && value.id === option.id;
  }

  selectOption(option: ExamAnswerOption) {
    this.answer.setValue(option);
    this.answer.updateValueAndValidity();
  }

  selectOtherRadio() {
    if (this.isOtherSelected()) {
      this.focusOtherInput('single');
      return;
    }
    this.answer.setValue(this.currentOtherOption);
    this.answer.updateValueAndValidity();
    this.focusOtherInput('single');
  }

  toggleMultipleOption(option: ExamAnswerOption) {
    this.setCheckboxAnswer({ checked: !this.checkboxState[option.id] }, option);
  }

  toggleOtherCheckbox() {
    this.toggleOtherMultiple({ checked: !this.checkboxState.other });
  }

  ensureOtherCheckboxSelected() {
    if (!this.checkboxState.other) {
      this.toggleOtherMultiple({ checked: true });
    }
  }

  toggleOtherMultiple({ checked }: Pick<MatCheckboxChange, 'checked'>) {
    this.checkboxState.other = checked;
    this.answer.setValue(addCheckedAnswer(this.answer.value, this.currentOtherOption, checked));
    this.answer.updateValueAndValidity();
    if (checked) {
      this.focusOtherInput('multiple');
    }
  }

  updateOtherText() {
    if (this.question?.type === 'select' && this.isOtherSelected()) {
      this.answer.setValue(this.currentOtherOption);
    }
    if (this.question?.type === 'selectMultiple' && this.checkboxState.other) {
      this.answer.setValue(addCheckedAnswer(this.answer.value, this.currentOtherOption, true));
    }
    this.answer.updateValueAndValidity();
  }

  private focusOtherInput(type: 'single' | 'multiple') {
    setTimeout(() => {
      const inputRef = type === 'single' ? this.singleOtherInput : this.multipleOtherInput;
      inputRef?.nativeElement.focus();
    });
  }
}
