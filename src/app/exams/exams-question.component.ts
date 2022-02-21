import {
  Component, Input, OnInit, OnChanges, EventEmitter, Output, ElementRef, ViewChildren, AfterViewChecked, QueryList, ChangeDetectorRef
} from '@angular/core';
import {
  FormGroup,
  FormArray
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { ExamsService } from './exams.service';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styleUrls: [ 'exams-question.scss' ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges, AfterViewChecked {

  @Input() question: FormGroup;
  @Output() questionChange = new EventEmitter<any>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  @ViewChildren('choiceInput') choiceInputs: QueryList<ElementRef>;
  showChoicesError: boolean;
  showCorrectChoiceError: boolean;
  correctCheckboxes: any = {};
  questionForm: FormGroup = this.examsService.newQuestionForm(this.examType === 'courses');
  initializing = true;
  choiceAdded = false;
  private onDestroy$ = new Subject<void>();
  get choices(): FormArray {
    return (<FormArray>this.questionForm.controls.choices);
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
  }

  ngOnChanges() {
    this.initializing = true;
    this.updateQuestion(this.question);
    if (this.question.value.choices.length === 0) {
      this.showChoicesError = true;
    }
    if (this.question.value.correctChoice.length === 0) {
      this.showCorrectChoiceError = true;
    }
  }

  ngAfterViewChecked() {
    if (this.choiceAdded) {
      this.choiceInputs.last.nativeElement.focus();
      this.choiceAdded = false;
      this.cdRef.detectChanges();
    }
    this.choices.statusChanges.subscribe((data) => {
      if (data && this.choices.valid) {
        this.showChoicesError = false;
      } else {
        this.showChoicesError = true;
      }
      if (data && this.question.controls.correctChoice.valid) {
        this.showCorrectChoiceError = false;
      } else {
        this.showCorrectChoiceError = true;
      }
    });
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    this.choices.push(this.examsService.newQuestionChoice(newId));
    this.choiceAdded = true;
  }

  removeChoice(index: number) {
    const correctCh = this.questionForm.controls.correctChoice.value;
    const correctChoiceIndex = correctCh.indexOf(this.choices.value[index].id);
    if (correctChoiceIndex > -1) {
      correctCh.splice(correctChoiceIndex);
    }
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

  setCorrect(event: any, choice: any) {
    const formControls = this.questionForm.controls;
    const newChoiceId = choice.controls.id.value;
    let correctChoices = formControls.correctChoice.value || [];
    if (event.checked) {
      correctChoices = formControls.type.value === 'selectMultiple' ? correctChoices.concat([ newChoiceId ]) : [ newChoiceId ];
    } else {
      correctChoices.splice(correctChoices.indexOf(newChoiceId), 1);
    }
    this.questionForm.controls.correctChoice.setValue(correctChoices);
    this.questionForm.controls.choices.value.forEach(({ id }) => {
      this.correctCheckboxes[id] = correctChoices.indexOf(id) > -1;
    });
  }

  choiceTrackByFn(index, item) {
    return item.id;
  }

  clearChoices() {
    this.questionForm.patchValue({ 'correctChoice': '' });
    while (this.choices.length !== 0) {
      this.removeChoice(0);
    }
  }

  updateQuestion(question: FormGroup) {
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

}
