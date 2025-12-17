import {
  Component, Input, OnInit, OnChanges, EventEmitter, Output, ElementRef,
  ViewChildren, AfterViewChecked, QueryList, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { ExamsService, QuestionChoiceFormGroup, QuestionFormGroup } from './exams.service';
import { CustomValidators } from '../validators/custom-validators';
import { trackByIdVal } from '../shared/table-helpers';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styleUrls: [ 'exams-question.scss' ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {

  @Input() question: QuestionFormGroup;
  @Output() questionChange = new EventEmitter<QuestionFormGroup>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  @ViewChildren('choiceInput') choiceInputs: QueryList<ElementRef>;
  correctCheckboxes: any = {};
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
