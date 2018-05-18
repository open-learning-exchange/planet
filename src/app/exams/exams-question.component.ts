import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray
} from '@angular/forms';

@Component({
  selector: 'planet-exam-question',
  templateUrl: 'exams-question.component.html'
})
export class ExamsQuestionComponent implements OnInit {

  @Input() questionForm: FormGroup;
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;
  title: any;
  constructor() {}

  ngOnInit() {
    this.choices = <FormArray>this.questionForm.controls.choices;
    this.title = this.questionForm.controls.header;
  }

  addChoice() {
    this.choices.push(new FormControl());
  }

  removeChoice(index: number) {
    this.choices.removeAt(index);
  }

  deleteQuestion() {
    this.questionRemove.emit();
  }

}
