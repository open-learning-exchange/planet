import { Component, Input, OnInit, OnChanges, EventEmitter, Output } from '@angular/core';
import {
  FormGroup,
  FormArray
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { uniqueId } from '../shared/utils';
import { ExamsService } from './exams.service';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html',
  styles: [ `
    .question-choices {
      display: grid;
      grid-template-columns: repeat(auto-fill, 180px 24px);
      align-items: center;
      grid-column-gap: 5px;
    }
    .survey-question {
      grid-template-columns: repeat(auto-fill, 180px);
    }
  ` ]
})
export class ExamsQuestionComponent implements OnInit, OnChanges {

  @Input() question: FormGroup;
  @Output() questionChange = new EventEmitter<any>();
  @Input() examType = 'courses';
  @Output() questionRemove = new EventEmitter<any>();
  correctCheckboxes: any = {};
  questionForm: FormGroup = this.examsService.newQuestionForm(this.examType === 'courses');
  initializing = true;
  private onDestroy$ = new Subject<void>();
  get choices(): FormArray {
    return (<FormArray>this.questionForm.controls.choices);
  }

  constructor(
    private examsService: ExamsService
  ) {}

  ngOnInit() {
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
  }

  addChoice() {
    const newId = uniqueId();
    this.correctCheckboxes[newId] = false;
    this.choices.push(this.examsService.newQuestionChoice(newId));
  }

  removeChoice(index: number) {
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
      if (formControls.type.value === 'selectMultiple') {
        correctChoices = correctChoices.concat([ newChoiceId ]);
      } else {
        correctChoices = [ newChoiceId ];
      }
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
    this.initializing = false;
  }

}
