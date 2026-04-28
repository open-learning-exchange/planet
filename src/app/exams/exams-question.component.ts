import {
  Component, Input, OnInit, OnChanges, EventEmitter, Output, ElementRef,
  ViewChildren, AfterViewChecked, QueryList, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { ExamsService, QuestionChoiceFormGroup, QuestionFormGroup } from './exams.service';
import { CustomValidators } from '../validators/custom-validators';
import { trackByIdVal } from '../shared/table-helpers';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { NgIf, NgFor } from '@angular/common';
import { PlanetMarkdownTextboxComponent } from '../shared/forms/planet-markdown-textbox.component';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styleUrls: ['exams-question.scss'],
  imports: [
    FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatSelect, MatOption, NgIf,
    PlanetMarkdownTextboxComponent, MatError, FormErrorMessagesComponent, MatButton, NgFor, MatCheckbox,
    MatInput, MatIconButton, MatSuffix, MatIcon, MatButtonToggle, MatButtonToggleGroup
  ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {

  @Input() question: QuestionFormGroup;
  @Output() questionChange = new EventEmitter<QuestionFormGroup>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  @ViewChildren('choiceInput') choiceInputs: QueryList<ElementRef>;
  correctCheckboxes: any = {};
  scaleMaxOptions = [ 5, 6, 7, 8, 9 ];
  questionForm: QuestionFormGroup = this.examsService.newQuestionForm(this.examType === 'courses');
  initializing = true;
  choiceAdded = false;
  trackByFn = trackByIdVal;
  private onDestroy$ = new Subject<void>();
  get choices(): FormArray<QuestionChoiceFormGroup> {
    return this.questionForm.controls.choices;
  }

  constructor(
    private examsService: ExamsService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.questionForm.controls.correctChoice.setValidators(CustomValidators.choiceSelected(this.examType === 'courses'));
    const onFormChange = () => {
      if (!this.initializing) {
        this.questionChange.emit(this.questionForm);
      }
    };
    this.questionForm.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(onFormChange);
    this.questionForm.controls.choices.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(onFormChange);
    this.questionForm.controls.hasOtherOption.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      onFormChange();
    });
  }

  ngOnChanges() {
    this.initializing = true;
    this.updateQuestion(this.question);
  }

  ngAfterViewChecked() {
    if (this.choiceAdded) {
      this.choiceInputs.last.nativeElement.focus();
      this.choiceAdded = false;
      this.cdRef.detectChanges();
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    this.choices.push(this.examsService.newQuestionChoice(newId));
    this.choiceAdded = true;
  }

  removeChoice(index: number) {
    const correctChoices = this.getCorrectChoices();
    const choiceId = this.choices.at(index).controls.id.value;
    const correctChoiceIndex = correctChoices.indexOf(choiceId);
    if (correctChoiceIndex > -1) {
      correctChoices.splice(correctChoiceIndex, 1);
      this.setCorrectChoiceValue(correctChoices);
    }
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

  setCorrect(event: any, choice: any) {
    const formControls = this.questionForm.controls;
    const newChoiceId = choice.controls.id.value;
    const correctChoices = this.getCorrectChoices();
    if (event.checked) {
      const updatedChoices = formControls.type.value === 'selectMultiple' ? correctChoices.concat([ newChoiceId ]) : [ newChoiceId ];
      this.setCorrectChoiceValue(updatedChoices);
    } else {
      const index = correctChoices.indexOf(newChoiceId);
      if (index > -1) {
        correctChoices.splice(index, 1);
      }
      this.setCorrectChoiceValue(correctChoices);
    }
    this.questionForm.controls.choices.value.forEach(({ id }) => {
      this.correctCheckboxes[id] = this.getCorrectChoices().indexOf(id) > -1;
    });
  }

  clearChoices() {
    this.questionForm.patchValue({ 'correctChoice': '' });
    while (this.choices.length !== 0) {
      this.removeChoice(0);
    }
  }

  updateQuestion(question: QuestionFormGroup) {
    this.examsService.updateQuestion(this.questionForm, question);
    if (question.value.correctChoice instanceof Array) {
      question.value.correctChoice.forEach(choiceId => {
        this.correctCheckboxes[choiceId] = true;
      });
    } else {
      this.correctCheckboxes[question.value.correctChoice] = true;
    }
    this.examsService.checkValidFormComponent(this.questionForm, question.touched);
    this.initializing = false;
  }

  private getCorrectChoices(): string[] {
    const currentValue = this.questionForm.controls.correctChoice.value;
    if (Array.isArray(currentValue)) {
      return [ ...currentValue ];
    }
    return currentValue ? [ currentValue ] : [];
  }

  private setCorrectChoiceValue(choices: string[]) {
    const choiceValue = this.questionForm.controls.type.value === 'selectMultiple' ? choices : (choices[0] || '');
    this.questionForm.controls.correctChoice.setValue(choiceValue);
  }

}
