import {
  Component, Input, OnInit, OnChanges, EventEmitter, Output, ElementRef,
  ViewChildren, AfterViewChecked, QueryList, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { ExamsService } from './exams.service';
import { CustomValidators } from '../validators/custom-validators';
import { trackByIdVal } from '../shared/table-helpers';

type QuestionChoiceForm = FormGroup<{
  text: FormControl<string>;
  id: FormControl<string>;
}>;

type QuestionForm = FormGroup<{
  body: FormControl<string>;
  type: FormControl<string>;
  correctChoice: FormControl<string | string[]>;
  marks: FormControl<number>;
  choices: FormArray<QuestionChoiceForm>;
  hasOtherOption: FormControl<boolean>;
}>;

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styleUrls: [ 'exams-question.scss' ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {

  @Input() question: QuestionForm;
  @Output() questionChange = new EventEmitter<any>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  @ViewChildren('choiceInput') choiceInputs: QueryList<ElementRef>;
  correctCheckboxes: Record<string, boolean> = {};
  questionForm: QuestionForm = this.examsService.newQuestionForm(this.examType === 'courses') as unknown as QuestionForm;
  initializing = true;
  choiceAdded = false;
  trackByFn = trackByIdVal;
  private onDestroy$ = new Subject<void>();
  get choices(): FormArray<QuestionChoiceForm> {
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
    this.choices.push(this.examsService.newQuestionChoice(newId) as unknown as QuestionChoiceForm);
    this.choiceAdded = true;
  }

  removeChoice(index: number) {
    const correctChoiceValue = this.questionForm.controls.correctChoice.value;
    const choiceId = this.choices.value[index].id;
    const correctChoices = Array.isArray(correctChoiceValue)
      ? correctChoiceValue.filter((id) => id !== choiceId)
      : correctChoiceValue === choiceId
        ? ''
        : correctChoiceValue;
    this.questionForm.controls.correctChoice.setValue(correctChoices);
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

  setCorrect(event: MatCheckboxChange, choice: QuestionChoiceForm) {
    const formControls = this.questionForm.controls;
    const newChoiceId = choice.controls.id.value;
    const correctValue = formControls.correctChoice.value;
    const isMultipleChoice = formControls.type.value === 'selectMultiple';

    let correctChoices = Array.isArray(correctValue)
      ? [...correctValue]
      : correctValue
        ? [ correctValue ]
        : [];

    if (event.checked) {
      correctChoices = isMultipleChoice ? [ ...correctChoices, newChoiceId ] : [ newChoiceId ];
    } else {
      correctChoices = correctChoices.filter(choiceId => choiceId !== newChoiceId);
    }

    const updatedValue = isMultipleChoice ? correctChoices : (correctChoices[0] ?? '');
    this.questionForm.controls.correctChoice.setValue(updatedValue);
    this.questionForm.controls.choices.value.forEach(({ id }) => {
      this.correctCheckboxes[id] = correctChoices.indexOf(id) > -1;
    });
  }

  clearChoices() {
    this.questionForm.patchValue({ 'correctChoice': '' });
    while (this.choices.length !== 0) {
      this.removeChoice(0);
    }
  }

  updateQuestion(question: QuestionForm) {
    this.examsService.updateQuestion(this.questionForm as unknown as any, question as unknown as any);
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

}
