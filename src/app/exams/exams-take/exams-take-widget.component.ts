import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';

import { ExamQuestion } from '../exams.model';
import {
  ExamAnswerOption, ExamAnswerValue, addCheckedAnswer, createOtherAnswerOption, isOtherAnswerOption, restoreExamAnswer
} from './exam-answer.helpers';
import { PlanetMarkdownTextboxComponent } from '../../shared/forms/planet-markdown-textbox.component';

@Component({
  selector: 'planet-exams-take-widget',
  templateUrl: './exams-take-widget.component.html',
  styleUrls: ['./exams-take-widget.component.scss'],
  imports: [
    NgSwitch, NgSwitchCase, MatFormField, MatLabel, MatInput, ReactiveFormsModule, PlanetMarkdownTextboxComponent,
    MatRadioGroup, NgFor, MatRadioButton, MatCheckbox, NgIf, FormsModule
  ]
})
export class ExamsTakeWidgetComponent implements OnChanges {

  @Input() question: (ExamQuestion & { hasOtherOption?: boolean }) | null = null;
  @Input() answer: FormControl<ExamAnswerValue>;
  @Input() examType: 'survey' | 'exam' = 'survey';
  @Input() storedAnswerValue: ExamAnswerValue | null = null;

  checkboxState: Record<string, boolean> = {};
  currentOtherOption = createOtherAnswerOption();

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

  toggleOtherMultiple({ checked }: Pick<MatCheckboxChange, 'checked'>) {
    this.checkboxState.other = checked;
    this.answer.setValue(addCheckedAnswer(this.answer.value, this.currentOtherOption, checked));
    this.answer.updateValueAndValidity();
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
}
