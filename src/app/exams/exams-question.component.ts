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

  @Input() question: any;
  @Input() questionForm: FormGroup;
  @Output() questionRemove = new EventEmitter<any>();
  choices: FormArray;

  constructor() {}

  ngOnInit() {
    this.choices = <FormArray>this.questionForm.controls.choices;
    if (this.question.choices) {
      this.question.choices.map((ch, i) => {
        this.addChoice();
      });
      this.questionForm.patchValue(this.question);
    }
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
