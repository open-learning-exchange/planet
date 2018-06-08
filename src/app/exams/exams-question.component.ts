import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray
} from '@angular/forms';
import { uniqueId } from '../shared/utils';

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
  ` ]
})
export class ExamsQuestionComponent implements OnInit {

  @Input() questionForm: FormGroup;
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;
  correctCheckboxes: boolean[];

  constructor() {}

  ngOnInit() {
    this.choices = <FormArray>this.questionForm.controls.choices;
  }

  addChoice() {
    this.choices.push(new FormControl({ 'text': '', 'id': uniqueId() }));
  }

  removeChoice(index: number) {
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

  setCorrect(event: any, choice: any) {
    this.questionForm.controls.correctIndex.setValue(event.checked ? choice.id : -1);
  }

}
